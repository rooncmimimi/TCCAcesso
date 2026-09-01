-- =====================================================================
-- 0041_timestamptz_postagens_comentarios_mensagens_conversas.sql
-- Fase 8 — corrige o tipo das colunas de data/hora dessas 4 tabelas.
--
-- Hoje `created_at`/`updated_at` de `postagens`, `comentarios`,
-- `mensagens` e `conversas` são `TIMESTAMP WITHOUT TIME ZONE` (ao
-- contrário de `editado_em` e `admin_audit_logs.created_at`, que já são
-- `TIMESTAMPTZ`). Isso não é só uma inconsistência de schema: o driver
-- `pg` interpreta um timestamp "sem fuso" lido do banco usando o fuso do
-- processo Node, e grava também sem fuso — o comportamento correto só
-- acontece hoje porque o processo Node de produção roda em UTC. Qualquer
-- ambiente cujo Node rode em outro fuso já exibiria a hora errada sem
-- precisar mexer no banco.
--
-- Prova de que o dado gravado já É um instante UTC (não uma hora local
-- disfarçada), confirmada ANTES de propor esta migration:
--   SHOW timezone;  →  UTC (sessão do banco sempre grava em UTC)
-- Logo, reinterpretar o valor bruto já gravado como UTC (`AT TIME ZONE
-- 'UTC'`) é uma correção, não um deslocamento: o número exibido depois
-- da conversão é IDÊNTICO ao que já era exibido antes (mesma data, mesma
-- hora) — só o TIPO da coluna passa a carregar essa informação de fuso
-- explicitamente, em vez de depender do fuso do processo que a lê.
--
-- `editado_em` (já TIMESTAMPTZ) e `admin_audit_logs.created_at` (idem)
-- não são tocados aqui — já estão corretos.
--
-- Rollback: `ALTER COLUMN ... TYPE TIMESTAMP WITHOUT TIME ZONE USING col
-- AT TIME ZONE 'UTC'` (mesma lógica invertida) — seguro enquanto o
-- processo que ler o dado depois continuar rodando em UTC.
-- =====================================================================

ALTER TABLE public.postagens
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE public.comentarios
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE public.mensagens
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE public.conversas
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
