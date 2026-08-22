-- =====================================================================
-- 0024_empresa_motivo_suspensao.sql
-- Campos próprios para suspensão administrativa de empresas.
--
-- Não reaproveita avaliado_por/avaliado_em/motivo_reprovacao: esses
-- campos continuam representando exclusivamente a avaliação/aprovação
-- cadastral inicial da empresa. Suspensão é uma ação administrativa
-- separada, sobre uma empresa já aprovada, e precisa de seu próprio
-- rastro para não sobrescrever quem aprovou e quando.
--
-- suspenso_por usa ON DELETE SET NULL, mesmo padrão de avaliado_por:
-- o histórico de suspensão sobrevive à exclusão da conta do admin.
-- =====================================================================

ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS suspenso_por UUID,
    ADD COLUMN IF NOT EXISTS suspenso_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_suspensao TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_empresas_suspenso_por'
    ) THEN
        ALTER TABLE public.empresas
            ADD CONSTRAINT fk_empresas_suspenso_por
            FOREIGN KEY (suspenso_por) REFERENCES public.usuarios (id)
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
