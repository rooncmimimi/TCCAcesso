-- =====================================================================
-- 0006_vincular_empresa_a_conta_candidato.sql
--
-- Liga a empresa à conta de candidato de quem a cadastrou.
--
-- A regra do produto passou a ser: para ter conta de empresa é preciso ter conta de candidato, e as
-- duas ficam vinculadas. As contas continuam **separadas** — cada uma com seu próprio `usuarios` e
-- seu próprio login —, então nada da autorização muda: quem é `tipo_usuario = 'empresa'` segue
-- sendo empresa, quem é `candidato` segue sendo candidato. O vínculo é só o registro de quem
-- respondeu pelo cadastro.
--
-- Por que uma coluna nova e não reaproveitar `usuario_id`: aquele é o usuário **da empresa** (o
-- login institucional). Este é o usuário **candidato** da pessoa física por trás dela. São dois
-- papéis diferentes e precisam de dois campos.
--
-- `ON DELETE SET NULL`: se a pessoa excluir a conta de candidato, a empresa continua existindo e
-- aprovada — o que se perde é só o registro de quem a criou. Apagar a empresa junto seria perder
-- vagas e candidaturas por causa de uma conta pessoal.
-- =====================================================================

ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS usuario_candidato_id uuid;

COMMENT ON COLUMN public.empresas.usuario_candidato_id IS
    'Conta de candidato da pessoa que cadastrou a empresa. Nulo nas empresas anteriores a esta regra.';

ALTER TABLE public.empresas
    DROP CONSTRAINT IF EXISTS fk_empresas_usuario_candidato;

ALTER TABLE public.empresas
    ADD CONSTRAINT fk_empresas_usuario_candidato
        FOREIGN KEY (usuario_candidato_id)
        REFERENCES public.usuarios (id)
        ON DELETE SET NULL;

-- Para responder "quais empresas esta pessoa cadastrou?" sem varrer a tabela.
CREATE INDEX IF NOT EXISTS idx_empresas_usuario_candidato_id
    ON public.empresas (usuario_candidato_id)
 WHERE usuario_candidato_id IS NOT NULL;
