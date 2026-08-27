-- =====================================================================
-- 0009_refresh_tokens.sql
-- Refresh tokens com rotação e revogação (somente hash é persistido).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    expira_em       TIMESTAMPTZ NOT NULL,
    revogado_em     TIMESTAMPTZ,
    substituido_por UUID,
    user_agent      VARCHAR(255),
    ip              VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_refresh_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_refresh_substituido FOREIGN KEY (substituido_por)
        REFERENCES public.refresh_tokens (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_usuario_ativo
    ON public.refresh_tokens (usuario_id)
    WHERE revogado_em IS NULL;
