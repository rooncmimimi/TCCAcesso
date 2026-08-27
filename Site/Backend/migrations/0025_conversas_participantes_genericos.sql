-- =====================================================================
-- 0025_conversas_participantes_genericos.sql
-- Generaliza "conversas" de candidato<->empresa para usuario<->usuario,
-- permitindo conversas entre quaisquer dois usuários autenticados
-- (candidato-candidato, empresa-empresa, administrador-qualquer um).
--
-- Preserva 100% dos dados existentes via backfill antes de qualquer
-- DROP. Seguro para rodar tanto num banco vazio quanto num banco com
-- conversas reais.
-- =====================================================================

-- 1. Colunas novas (nullable por enquanto, para permitir o backfill)
ALTER TABLE public.conversas
    ADD COLUMN IF NOT EXISTS usuario_a_id UUID,
    ADD COLUMN IF NOT EXISTS usuario_b_id UUID;

-- 2. Backfill: resolve usuario_id do candidato e da empresa de cada
--    conversa existente, gravando em ordem canônica (menor UUID em
--    usuario_a_id) para o índice único do par funcionar.
UPDATE public.conversas c
SET usuario_a_id = LEAST(cand.usuario_id, emp.usuario_id),
    usuario_b_id = GREATEST(cand.usuario_id, emp.usuario_id)
FROM public.candidatos cand, public.empresas emp
WHERE cand.id = c.candidato_id
  AND emp.id = c.empresa_id
  AND c.usuario_a_id IS NULL;

-- 3. Validação: a migration falha (e não avança) se sobrar alguma
--    conversa sem os dois participantes resolvidos — nunca perde dado
--    silenciosamente.
DO $$
DECLARE
    pendentes INTEGER;
BEGIN
    SELECT count(*) INTO pendentes
    FROM public.conversas
    WHERE usuario_a_id IS NULL OR usuario_b_id IS NULL;

    IF pendentes > 0 THEN
        RAISE EXCEPTION
            'Backfill incompleto: % conversa(s) sem usuario_a_id/usuario_b_id resolvido. Migration abortada.',
            pendentes;
    END IF;
END $$;

-- 4. Obrigatórias
ALTER TABLE public.conversas
    ALTER COLUMN usuario_a_id SET NOT NULL,
    ALTER COLUMN usuario_b_id SET NOT NULL;

-- 5. FKs para usuarios(id)
ALTER TABLE public.conversas
    ADD CONSTRAINT fk_conversa_usuario_a
        FOREIGN KEY (usuario_a_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_conversa_usuario_b
        FOREIGN KEY (usuario_b_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- 6. Participantes distintos + ordenação canônica (garante que o par
--    (A,B) é sempre representado da mesma forma, nunca duplicado como
--    (B,A))
ALTER TABLE public.conversas
    ADD CONSTRAINT chk_conversa_participantes_distintos CHECK (usuario_a_id <> usuario_b_id),
    ADD CONSTRAINT chk_conversa_ordem_canonica CHECK (usuario_a_id < usuario_b_id);

-- 7. Índice único do par (substitui uq_conversa)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversas_par_unico
    ON public.conversas (usuario_a_id, usuario_b_id);

-- 8. Índices individuais (substituem idx_conversa_candidato/idx_conversa_empresa)
CREATE INDEX IF NOT EXISTS idx_conversas_usuario_a ON public.conversas (usuario_a_id);
CREATE INDEX IF NOT EXISTS idx_conversas_usuario_b ON public.conversas (usuario_b_id);

-- 9. Remove as constraints/índices antigos amarrados a candidato_id/empresa_id
ALTER TABLE public.conversas DROP CONSTRAINT IF EXISTS fk_conversa_candidato;
ALTER TABLE public.conversas DROP CONSTRAINT IF EXISTS fk_conversa_empresa;
ALTER TABLE public.conversas DROP CONSTRAINT IF EXISTS uq_conversa;
DROP INDEX IF EXISTS idx_conversa_candidato;
DROP INDEX IF EXISTS idx_conversa_empresa;

-- 10. Remove as colunas antigas — a partir daqui "conversas" representa
--     participantes apenas via usuario_a_id/usuario_b_id.
ALTER TABLE public.conversas
    DROP COLUMN IF EXISTS candidato_id,
    DROP COLUMN IF EXISTS empresa_id;
