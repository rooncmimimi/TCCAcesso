-- =====================================================================
-- 0008_recuperacao_senha.sql
-- Códigos de recuperação de senha (hash + expiração + limite de tentativas).
-- O código em texto puro NUNCA é armazenado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.codigos_recuperacao_senha (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL,
    codigo_hash     VARCHAR(255) NOT NULL,
    expira_em       TIMESTAMPTZ NOT NULL,
    tentativas      SMALLINT NOT NULL DEFAULT 0,
    utilizado_em    TIMESTAMPTZ,
    ip_solicitante  VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_recuperacao_tentativas CHECK (tentativas >= 0 AND tentativas <= 10)
);

CREATE INDEX IF NOT EXISTS idx_recuperacao_usuario_valido
    ON public.codigos_recuperacao_senha (usuario_id, expira_em DESC)
    WHERE utilizado_em IS NULL;
