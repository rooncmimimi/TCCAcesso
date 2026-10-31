# Migrations do banco

O banco da aplicação fica no schema `public` do PostgreSQL (Supabase). As migrations são arquivos
SQL numerados, aplicados em ordem e uma única vez por banco.

## Histórico de migrations

| Arquivo | O que faz |
| --- | --- |
| `0001_esquema_inicial.sql` | Cria a estrutura inicial do ACESSO: enums, tabelas, índices, chaves estrangeiras, funções, gatilhos, RLS e comentários. É o baseline do schema da aplicação. |
| `0002_catalogo_deficiencias.sql` | Preenche o catálogo `deficiencias`, usado pelo candidato para informar suas deficiências no perfil. |
| `0003_remover_chatbot_e_administradores.sql` | Remove as antigas tabelas do chatbot (`chatbot_conversas`, `chatbot_mensagens`), o enum `papel_chatbot` e a tabela `administradores`, que não eram utilizados pelos fluxos da aplicação. A administração passou a usar `usuarios.tipo_usuario`. |
| `0004_pais_do_candidato_e_cadastro_concluido.sql` | Adiciona `candidatos.pais` (ISO 3166-1 alpha-2) e `usuarios.cadastro_concluido_em`, usados no cadastro em etapas e na retomada após a confirmação de e-mail. |
| `0005_google_termos_e_pais_da_empresa.sql` | Adiciona `usuarios.google_id`, o registro de aceite/versão dos documentos legais (`termos_aceitos_em`, `termos_versao`) e `empresas.pais` (ISO 3166-1 alpha-2). |
| `0006_vincular_empresa_a_conta_candidato.sql` | Adiciona `empresas.usuario_candidato_id`, identificando a conta de candidato da pessoa que cadastrou a empresa. A conta institucional (`empresas.usuario_id`) continua separada. |

As descrições representam o efeito de cada migration. Para detalhes de regras, constraints e decisões,
consulte os comentários no próprio arquivo SQL e o [guia do schema](../ESQUEMA_DO_BANCO.md).

## Como aplicar

Na pasta `Site/Backend`:

```bash
npm run migrate
```

O script (`scripts/migrar.js`) lê as variáveis `DB_*` do ambiente, cria a tabela técnica
`public.migracoes_aplicadas` se ela não existir e executa, em ordem, somente os arquivos ainda não
registrados. Cada arquivo roda dentro de uma transação e só é marcado como aplicado se terminar com
sucesso. Executar novamente sem migrations pendentes não altera o schema.

Em um banco que já tinha o schema antes de existir o controle de migrations, o script registra
`0001_esquema_inicial.sql` como baseline em vez de tentar executar o esquema inicial sobre tabelas
existentes.

O `render.yaml` (na raiz do repositório) declara `buildCommand: npm install && npm run migrate`. Num serviço
criado a partir dele, as migrations rodam no build antes de a versão nova entrar no ar e, se uma falhar, o
build falha. **Isso só vale se o Build Command do serviço no painel do Render tiver `npm run migrate`**: um
serviço criado à mão ignora o `render.yaml`. Confira em Settings → Build Command; se não tiver, aplique cada
migration nova com `npm run migrate`, apontando para o banco de produção, antes de publicar o código que
depende dela.

## Convenções

- Tabelas no plural e colunas em `snake_case`, em português. Chaves estrangeiras terminam em `_id`.
- Datas de criação usam `criado_em`; tabelas mutáveis também podem ter `atualizado_em`, ambos como `timestamptz`.
- Valores de enum são minúsculos e usam `_` entre palavras.
- Prefixos de objetos: `pk_`, `fk_`, `uq_`, `ck_`, `idx_` e `trg_`.
- RLS está habilitado nas tabelas do schema `public`. No desenho atual, o backend controla o acesso e conecta com a credencial configurada no servidor; não há políticas RLS de usuário final configuradas nas tabelas da aplicação. Não exponha credenciais do banco no frontend.
- Este conjunto de migrations administra apenas o schema `public` da aplicação. Não crie nem altere manualmente objetos dos schemas internos `auth`, `storage` ou outros schemas gerenciados pelo Supabase.

## Regra para novas mudanças

A última migration versionada neste repositório é a `0006`. Portanto, a próxima deve ser
`0007_<descricao_curta>.sql`, seguida de `0008_...` e assim por diante.

**Nunca edite uma migration que já foi aplicada em algum ambiente.** Para corrigir ou alterar o schema,
crie uma nova migration incremental. Não apague nem recrie `migracoes_aplicadas`: ela é o controle
que impede reaplicações acidentais.
