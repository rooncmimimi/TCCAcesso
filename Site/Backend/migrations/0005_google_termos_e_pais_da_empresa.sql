-- =====================================================================
-- 0005_google_termos_e_pais_da_empresa.sql
--
-- Três acréscimos, todos colunas novas e opcionais — nenhuma tabela é criada, alterada em tipo ou
-- removida, e nada que já existe muda de comportamento.
--
-- 1. `usuarios.google_id` — o identificador estável da conta Google (a claim `sub` do ID token),
--    que é o que vincula uma conta Google a uma conta ACESSO. É `sub`, e não o e-mail, porque o
--    e-mail de uma conta Google pode mudar e pode ser reaproveitado; `sub` não. Único, para a mesma
--    conta Google nunca ficar vinculada a dois usuários.
--
-- 2. `usuarios.termos_aceitos_em` e `usuarios.termos_versao` — registro de qual versão dos
--    documentos a pessoa aceitou e quando. Sem isso o aceite existe só como um booleano que ninguém
--    guarda, e não há como provar o que foi aceito quando o texto mudar.
--
-- 3. `empresas.pais` — o cadastro institucional pede o país no endereço, e `empresas` só tinha
--    cidade, estado, endereço e CEP. Mesmo formato e mesma justificativa de `candidatos.pais`
--    (0004): ISO 3166-1 alpha-2, porque o código não muda com o idioma da interface.
--
-- Contas que já existem ficam com as três colunas nulas, o que é a leitura correta: não vieram do
-- Google, e aceitaram os termos numa época em que a versão não era registrada.
-- =====================================================================

-- 1. Vínculo com a conta Google.
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS google_id varchar(255);

COMMENT ON COLUMN public.usuarios.google_id IS
    'Claim `sub` do ID token do Google: identificador estável da conta. Nulo = conta sem Google vinculado.';

-- Índice único parcial: muitos usuários sem Google convivem, mas um `sub` nunca se repete.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_google_id
    ON public.usuarios (google_id)
 WHERE google_id IS NOT NULL;

-- 2. Registro do aceite dos documentos legais.
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz;

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS termos_versao varchar(20);

COMMENT ON COLUMN public.usuarios.termos_aceitos_em IS
    'Quando a pessoa aceitou os Termos de Uso e o Aviso de Privacidade. Nulo = aceite não registrado.';

COMMENT ON COLUMN public.usuarios.termos_versao IS
    'Versão dos documentos aceita, como `2026-10-09`. Permite saber o que foi aceito quando o texto mudar.';

-- 3. País da empresa.
ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS pais char(2);

COMMENT ON COLUMN public.empresas.pais IS
    'País da sede, em ISO 3166-1 alpha-2 maiúsculo (BR, US, ES). Nulo = não informado.';

ALTER TABLE public.empresas
    DROP CONSTRAINT IF EXISTS ck_empresas_pais;

ALTER TABLE public.empresas
    ADD CONSTRAINT ck_empresas_pais CHECK (pais IS NULL OR pais ~ '^[A-Z]{2}$');
