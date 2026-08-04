-- =====================================================================
-- 0003_empresas_status_aprovacao.sql
-- Fluxo de aprovação de empresas pelo painel administrativo.
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_aprovacao_empresa') THEN
        CREATE TYPE public.status_aprovacao_empresa AS ENUM ('pendente', 'aprovada', 'reprovada');
    END IF;
END
$$;

ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS status_aprovacao public.status_aprovacao_empresa NOT NULL DEFAULT 'pendente',
    ADD COLUMN IF NOT EXISTS capa TEXT,
    ADD COLUMN IF NOT EXISTS cultura_inclusiva TEXT,
    ADD COLUMN IF NOT EXISTS motivo_reprovacao TEXT,
    ADD COLUMN IF NOT EXISTS avaliado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS avaliado_por UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_empresas_avaliado_por'
    ) THEN
        ALTER TABLE public.empresas
            ADD CONSTRAINT fk_empresas_avaliado_por
            FOREIGN KEY (avaliado_por) REFERENCES public.usuarios (id)
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_empresas_status_aprovacao
    ON public.empresas (status_aprovacao);

CREATE INDEX IF NOT EXISTS idx_empresas_nome_trgm
    ON public.empresas USING gin (
        public.acesso_normalizar(coalesce(nome_fantasia, razao_social)) gin_trgm_ops
    );
