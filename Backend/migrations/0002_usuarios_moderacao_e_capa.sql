-- =====================================================================
-- 0002_usuarios_moderacao_e_capa.sql
-- Campos de moderação (painel administrativo) e imagem de capa do perfil.
-- =====================================================================

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS capa_perfil TEXT,
    ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bloqueado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

-- Busca global por nome (ILIKE / trigram).
CREATE INDEX IF NOT EXISTS idx_usuarios_nome_trgm
    ON public.usuarios USING gin (public.acesso_normalizar(nome) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_ativo
    ON public.usuarios (tipo_usuario, ativo);
