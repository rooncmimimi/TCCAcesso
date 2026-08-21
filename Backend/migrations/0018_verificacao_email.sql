-- =====================================================================
-- 0018_verificacao_email.sql
-- Códigos de verificação para troca de e-mail (espelha 0008_recuperacao_senha).
-- O código em texto puro NUNCA é armazenado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.codigos_verificacao_email (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL,
    novo_email      VARCHAR(150) NOT NULL,
    codigo_hash     VARCHAR(255) NOT NULL,
    expira_em       TIMESTAMPTZ NOT NULL,
    tentativas      SMALLINT NOT NULL DEFAULT 0,
    utilizado_em    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_verif_email_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_verif_email_tentativas CHECK (tentativas >= 0 AND tentativas <= 10)
);

CREATE INDEX IF NOT EXISTS idx_verif_email_usuario_valido
    ON public.codigos_verificacao_email (usuario_id, expira_em DESC)
    WHERE utilizado_em IS NULL;
