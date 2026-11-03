-- =====================================================================
-- 0009_sessoes_e_dispositivos.sql
--
-- Sessões e dispositivos (Bloco 2): encerrar uma sessão passa a valer NA HORA (e não só quando o access
-- token de 30 minutos expira), e a lista de dispositivos mostra datas verdadeiras.
--
-- Cada renovação do refresh token revoga a linha atual e cria outra (veja `SessaoService`). Sem um
-- identificador que atravesse as renovações, "esta sessão" some e reaparece a cada 30 minutos. Por isso:
--
-- 1. `sessoes.familia_id`: identifica o LOGIN (um dispositivo), igual em todas as renovações dele. O access
--    token leva este valor (`sid`); o servidor confere que a família segue ativa. Encerrar a sessão revoga a
--    família inteira.
-- 2. `sessoes.iniciada_em`: quando o login aconteceu (não muda nas renovações).
-- 3. `sessoes.ultimo_uso_em`: quando foi a última renovação (a "última atividade" do dispositivo).
-- 4. Índices: achar a família ativa em cada requisição, e a limpeza periódica de linhas antigas.
--
-- Linhas que já existem: cada uma vira a sua própria família, com início e último uso iguais ao `criado_em`.
-- Isso só preenche colunas novas; nenhum dado existente é alterado ou apagado. Access tokens emitidos antes
-- (sem `sid`) seguem valendo até expirar.
--
-- COMO VOLTAR ATRÁS (nada depende destas colunas fora do Bloco 2):
--     DROP INDEX IF EXISTS public.idx_sessoes_expira_em;
--     DROP INDEX IF EXISTS public.idx_sessoes_familia_ativa;
--     ALTER TABLE public.sessoes
--         DROP COLUMN IF EXISTS ultimo_uso_em,
--         DROP COLUMN IF EXISTS iniciada_em,
--         DROP COLUMN IF EXISTS familia_id;
-- Desligue `SESSOES_DISPOSITIVOS_HABILITADO` no Render antes de reverter.
-- =====================================================================

ALTER TABLE public.sessoes
    ADD COLUMN IF NOT EXISTS familia_id    uuid,
    ADD COLUMN IF NOT EXISTS iniciada_em   timestamptz,
    ADD COLUMN IF NOT EXISTS ultimo_uso_em timestamptz;

-- Preenche só as colunas novas das linhas que já existem (cada uma é a sua própria família).
UPDATE public.sessoes
   SET familia_id    = id,
       iniciada_em   = criado_em,
       ultimo_uso_em = criado_em
 WHERE familia_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessoes_familia_ativa
    ON public.sessoes (familia_id)
 WHERE revogada_em IS NULL;

-- A limpeza periódica procura linhas vencidas.
CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em
    ON public.sessoes (expira_em);

COMMENT ON COLUMN public.sessoes.familia_id IS 'Identifica o login (um dispositivo): igual em todas as renovações do refresh token. O access token leva este valor.';
COMMENT ON COLUMN public.sessoes.iniciada_em IS 'Quando o login aconteceu. Não muda nas renovações.';
COMMENT ON COLUMN public.sessoes.ultimo_uso_em IS 'Última renovação do refresh token deste login (a última atividade do dispositivo).';
