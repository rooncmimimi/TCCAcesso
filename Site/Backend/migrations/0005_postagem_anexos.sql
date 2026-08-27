-- =====================================================================
-- 0005_postagem_anexos.sql
-- Múltiplas imagens e anexos (PDF/Word) por publicação + edição de post.
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_anexo_postagem') THEN
        CREATE TYPE public.tipo_anexo_postagem AS ENUM ('imagem', 'documento');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.postagem_anexos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postagem_id     UUID NOT NULL,
    tipo            public.tipo_anexo_postagem NOT NULL,
    url             TEXT NOT NULL,
    nome_original   VARCHAR(255),
    mime_type       VARCHAR(120),
    tamanho_bytes   BIGINT,
    ordem           SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_anexos_postagem FOREIGN KEY (postagem_id)
        REFERENCES public.postagens (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_anexos_tamanho CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_anexos_postagem
    ON public.postagem_anexos (postagem_id, ordem);

ALTER TABLE public.postagens
    ADD COLUMN IF NOT EXISTS editado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_postagens_feed
    ON public.postagens (ativo, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_postagens_conteudo_trgm
    ON public.postagens USING gin (public.acesso_normalizar(conteudo) gin_trgm_ops);
