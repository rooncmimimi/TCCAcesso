-- =====================================================================
-- 0013_vagas_busca_e_indices.sql
-- Recursos de acessibilidade da vaga, moderação e índices de performance.
-- =====================================================================

ALTER TABLE public.vagas
    ADD COLUMN IF NOT EXISTS recursos_acessibilidade TEXT[],
    ADD COLUMN IF NOT EXISTS oculta BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vagas_titulo_trgm
    ON public.vagas USING gin (public.acesso_normalizar(titulo) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vagas_empresa
    ON public.vagas (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vagas_filtros
    ON public.vagas (cidade, estado, modalidade, contrato);

CREATE INDEX IF NOT EXISTS idx_vagas_recursos
    ON public.vagas USING gin (recursos_acessibilidade);

CREATE INDEX IF NOT EXISTS idx_candidaturas_vaga
    ON public.candidaturas (vaga_id, status);

CREATE INDEX IF NOT EXISTS idx_candidaturas_candidato
    ON public.candidaturas (candidato_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_nao_lidas
    ON public.notificacoes (usuario_id, created_at DESC)
    WHERE lida = FALSE;
