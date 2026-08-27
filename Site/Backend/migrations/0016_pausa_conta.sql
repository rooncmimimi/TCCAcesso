-- =====================================================================
-- 0016_pausa_conta.sql
-- Pausa de conta self-service (independente do bloqueio administrativo).
-- =====================================================================

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS pausado_pelo_usuario BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pausado_em TIMESTAMPTZ;
