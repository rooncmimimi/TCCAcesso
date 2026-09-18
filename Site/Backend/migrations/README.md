# Migrations do banco

O banco da aplicação fica no schema `public` do PostgreSQL (Supabase). As migrations são arquivos
SQL numerados, aplicados em ordem e uma única vez por banco.

| Arquivo | O que faz |
| --- | --- |
| `0001_esquema_inicial.sql` | Cria o schema inteiro: funções, enums, tabelas, índices, gatilhos, RLS e comentários. Roda num banco sem as tabelas da aplicação. |
| `0002_catalogo_deficiencias.sql` | Preenche o catálogo `deficiencias`, que o candidato usa para se declarar PCD no perfil. |

## Como aplicar

```bash
npm run migrate
```

O script (`scripts/migrar.js`) lê as variáveis `DB_*` do ambiente, cria a tabela de controle
`migracoes_aplicadas` se ela não existir, e roda em ordem só o que ainda não foi aplicado — cada
arquivo dentro de uma transação, registrado apenas se der certo. Rodar de novo sem nada pendente
não faz nada.

Num banco que já tinha o schema antes deste controle existir, o baseline é registrado como
aplicado em vez de ser executado por cima.

O deploy do Render roda isso no build (`npm install && npm run migrate`, em `render.yaml`): se uma
migration falhar, o build falha e a versão anterior continua no ar.

## Convenções

- Tabelas no plural e colunas em `snake_case`, em português. Chave estrangeira termina em `_id`.
- `criado_em` em toda tabela e `atualizado_em` onde a linha pode mudar, sempre `timestamptz`.
  O gatilho `trg_<tabela>_atualizado_em` mantém `atualizado_em` certo.
- Valores de enum em minúsculas, com `_` entre palavras (`em_analise`, `jovem_aprendiz`).
- Nomes de objetos: `pk_`, `fk_`, `uq_`, `ck_`, `idx_` e `trg_`, seguidos da tabela e das colunas.
- RLS ligado em todas as tabelas e sem políticas. O Backend conecta como `postgres`, que ignora RLS;
  `anon` e `authenticated` não têm acesso.
- Nada em `auth`, `storage` ou nos outros schemas do Supabase é criado ou alterado aqui.

Mudanças novas entram como `0002_<descricao>.sql`, `0003_...`, sem editar migrations já aplicadas.
