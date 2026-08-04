-- =====================================================================
-- 0007_compartilhamentos.sql
-- Compartilhamento de publicações (com comentário opcional do usuário).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.compartilhamentos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postagem_id     UUID NOT NULL,
    usuario_id      UUID NOT NULL,
    comentario      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_compartilhamentos_postagem FOREIGN KEY (postagem_id)
        REFERENCES public.postagens (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_compartilhamentos_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_compartilhamentos_postagem
    ON public.compartilhamentos (postagem_id);

CREATE INDEX IF NOT EXISTS idx_compartilhamentos_usuario
    ON public.compartilhamentos (usuario_id, created_at DESC);
