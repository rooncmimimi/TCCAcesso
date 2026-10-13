-- =====================================================================
-- 0004_pais_do_candidato_e_cadastro_concluido.sql
--
-- Duas colunas para o cadastro de candidato em etapas:
--
-- 1. `candidatos.pais` — o país onde a pessoa mora, pedido na primeira etapa. Fica em `candidatos`
--    junto de `cidade`, `estado`, `endereco` e `cep`, que é onde toda localidade já mora; `usuarios`
--    guarda identidade e autenticação, não endereço.
--
--    Guarda o código ISO 3166-1 alpha-2 (`BR`, `US`, `ES`), não o nome escrito. O código não muda
--    com o idioma da interface, então a tela pode exibir "Brasil", "Brazil" ou "Brasil" a partir do
--    mesmo dado. Fica nulo onde ninguém informou: as contas que já existem são anteriores a este
--    campo e dizer `BR` por elas seria inventar.
--
-- 2. `usuarios.cadastro_concluido_em` — quando a pessoa terminou a última etapa do cadastro.
--    Nulo significa cadastro começado e não terminado, e é o que permite oferecer "retomar
--    cadastro" depois de confirmar o e-mail e entrar.
--
--    Não dava para deduzir isso do que já existia: `preferencias_acessibilidade` nasce na primeira
--    leitura (`AcessibilidadeService.obter` usa `findOrCreate`), então a linha existir não distingue
--    quem configurou de quem nunca abriu a tela.
--
--    As contas que já existem recebem `criado_em`: elas são anteriores ao fluxo em etapas e não têm
--    cadastro pendente nenhum para retomar.
-- =====================================================================

-- 1. País do candidato.
ALTER TABLE public.candidatos
    ADD COLUMN IF NOT EXISTS pais char(2);

COMMENT ON COLUMN public.candidatos.pais IS
    'País onde a pessoa mora, em ISO 3166-1 alpha-2 maiúsculo (BR, US, ES). Nulo = não informado.';

-- Só o formato; a lista de países válidos vive na aplicação, não no banco, para um país novo não
-- exigir migration.
ALTER TABLE public.candidatos
    DROP CONSTRAINT IF EXISTS ck_candidatos_pais;

ALTER TABLE public.candidatos
    ADD CONSTRAINT ck_candidatos_pais CHECK (pais IS NULL OR pais ~ '^[A-Z]{2}$');

-- 2. Conclusão do cadastro.
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS cadastro_concluido_em timestamptz;

COMMENT ON COLUMN public.usuarios.cadastro_concluido_em IS
    'Quando a pessoa terminou a última etapa do cadastro. Nulo = cadastro pendente de retomada.';

-- Contas anteriores a esta migration não têm etapa pendente.
UPDATE public.usuarios
   SET cadastro_concluido_em = criado_em
 WHERE cadastro_concluido_em IS NULL;
