-- =====================================================================
-- 0006_comentarios_respostas.sql
-- Respostas encadeadas, edição e moderação de comentários.
-- =====================================================================

ALTER TABLE public.comentarios
    ADD COLUMN IF NOT EXISTS comentario_pai_id UUID,
    ADD COLUMN IF NOT EXISTS editado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_comentarios_pai'
    ) THEN
        ALTER TABLE public.comentarios
            ADD CONSTRAINT fk_comentarios_pai
            FOREIGN KEY (comentario_pai_id) REFERENCES public.comentarios (id)
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_comentarios_postagem
    ON public.comentarios (postagem_id, created_at);

CREATE INDEX IF NOT EXISTS idx_comentarios_pai
    ON public.comentarios (comentario_pai_id);
