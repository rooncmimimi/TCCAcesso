-- =====================================================================
-- 0043_remover_2fa.sql
-- Remove a tabela criada em 0015 (mantida intacta como histórico — não
-- editar aquele arquivo). DROP TABLE já leva junto a FK, a CHECK
-- constraint, o índice único implícito de usuario_id e o trigger
-- associados a ela; nenhuma outra tabela, view ou função depende dela
-- (confirmado antes de escrever esta migration).
-- =====================================================================

DROP TABLE IF EXISTS public.autenticacao_dois_fatores;
