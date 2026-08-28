-- =====================================================================
-- 0027_vaga_publico_alvo.sql
-- Público-alvo estruturado da vaga (PCD / 50+ / PCD e 50+ / geral).
--
-- `exclusiva_pcd` (boolean) só representa 2 estados e não consegue
-- expressar "também aberta a 50+" nem "PCD e 50+ ao mesmo tempo".
-- `publico_alvo` substitui essa distinção com um ENUM de 4 valores,
-- SEM remover `exclusiva_pcd` — os dois campos coexistem por
-- compatibilidade; o backfill abaixo preenche publico_alvo a partir do
-- valor atual de exclusiva_pcd, sem perder nenhuma vaga já cadastrada.
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publico_alvo_vaga') THEN
        CREATE TYPE public.publico_alvo_vaga AS ENUM (
            'geral',
            'pcd',
            'cinquenta_mais',
            'pcd_cinquenta_mais'
        );
    END IF;
END
$$;

ALTER TABLE public.vagas
    ADD COLUMN IF NOT EXISTS publico_alvo public.publico_alvo_vaga NOT NULL DEFAULT 'geral';

-- Backfill: vagas já marcadas como exclusiva_pcd = true nascem como 'pcd'.
UPDATE public.vagas
SET publico_alvo = 'pcd'
WHERE exclusiva_pcd = TRUE AND publico_alvo = 'geral';

CREATE INDEX IF NOT EXISTS idx_vagas_publico_alvo
    ON public.vagas (publico_alvo);
