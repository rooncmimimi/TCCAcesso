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
| `0007_conta_sem_senha.sql` | `usuarios.senha_hash` passa a aceitar nulo, com a regra `ck_usuarios_senha_ou_google`: toda conta tem senha **ou** Google vinculado. Sustenta criar a conta no retorno do Google (`GOOGLE_CONTA_SEM_SENHA`). Traz no cabeçalho como voltar atrás. |
| `0009_sessoes_e_dispositivos.sql` | Sessões e dispositivos: acrescenta `sessoes.familia_id` (o login/dispositivo, igual em todas as renovações), `iniciada_em` e `ultimo_uso_em` e dois índices, e preenche as colunas novas das linhas existentes. Só acrescenta; não altera nem apaga dados. Encerrar uma sessão passa a valer na hora, só depois de ligar `SESSOES_DISPOSITIVOS_HABILITADO`. Traz no cabeçalho como voltar atrás. |
| `0010_dispositivos_confiaveis_e_eventos_de_seguranca.sql` | Dispositivo novo por e-mail e conta comprometida: cria `dispositivos_confiaveis` (só o hash do token do aparelho), `desafios_de_dispositivo` (só o HMAC do código de 6 dígitos), `links_de_seguranca` (só o hash do link) e `eventos_de_seguranca` (histórico sem segredo), todas com RLS ligada e `ON DELETE CASCADE` da conta. Só cria; não altera nem apaga nada existente. Só tem efeito depois de ligar `DISPOSITIVOS_CONFIAVEIS_HABILITADO`. Traz no cabeçalho como voltar atrás. |
| `0011_idioma_na_conta.sql` | Idioma do site na conta: acrescenta `preferencias_acessibilidade.idioma` (nula, `pt`/`en`/`es`). Só acrescenta; nenhuma linha existente muda. Só tem efeito depois de ligar `IDIOMA_NA_CONTA_HABILITADO`. Traz no cabeçalho como voltar atrás. |

| `0012_adaptacoes_rascunhos_e_privacidade_da_candidatura.sql` | Bloco 2 da acessibilidade avançada: `candidatos.exibir_deficiencia_no_perfil` (falso: a categoria de deficiência deixa de ser pública por padrão) e as tabelas `perfis_adaptacao`, `preferencias_comunicacao`, `candidatura_adaptacoes` (cópia autorizada por candidatura, apagada na retirada) e `candidatura_rascunhos`, todas com RLS e sem acesso para anon/authenticated. Só acrescenta. **Aplique antes de publicar o código que a usa** (o model passa a ler a coluna nova). Traz no cabeçalho como voltar atrás. |
| `0013_ambiente_entrevista_e_midia_da_vaga.sql` | Bloco 3 da acessibilidade avançada: `vagas` ganha `entrevista_adaptacoes`, `entrevista_observacao`, `ambiente_sensorial` (prévia sensorial), `acessibilidade_fisica` (mapa físico, com origem declarado ou verificado), `atividades`, `requisitos_desejaveis` e `etapas_selecao`, todas opcionais; e a tabela `vaga_midias` (vídeo da vaga em Libras com transcrição obrigatória e legenda WebVTT em texto), com RLS e sem acesso para anon/authenticated. Só acrescenta. **Aplique antes de publicar o código que a usa.** Traz no cabeçalho como voltar atrás. |

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

**Cuidado com bancos que receberam migrations à mão.** O script só adota o `0001` como baseline; todas as outras
entram como pendentes e são executadas. Elas são repetíveis (`IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT`), com uma exceção
de significado: o `UPDATE` da `0004` marca como concluído (`cadastro_concluido_em = criado_em`) todo cadastro que ainda
está pendente. Se o banco já tem as migrations aplicadas à mão, registre-as em `migracoes_aplicadas` antes de rodar
`npm run migrate`.

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

A última migration versionada neste repositório é a `0013`. Portanto, a próxima deve ser
`0014_<descricao_curta>.sql`, e assim por diante.

A numeração tem uma **lacuna de propósito**: a `0008` (verificação em duas etapas por aplicativo autenticador) foi escrita, nunca aplicada em
nenhum banco e removida. O código dela está preservado na branch `totp-bloco1-preservado`. O executor de migrations trabalha pelo nome
do arquivo, então a lacuna não atrapalha.

Toda **tabela nova** precisa, na própria migration, de `ENABLE ROW LEVEL SECURITY` e de
`REVOKE ALL ON TABLE public.<tabela> FROM anon, authenticated`, como fazem a `0001` e o `scripts/migrar.js`. Os privilégios
padrão do projeto Supabase atual já não concedem nada a esses papéis, mas um projeto novo pode conceder.

**Nunca edite uma migration que já foi aplicada em algum ambiente.** Para corrigir ou alterar o schema,
crie uma nova migration incremental. Não apague nem recrie `migracoes_aplicadas`: ela é o controle
que impede reaplicações acidentais.
