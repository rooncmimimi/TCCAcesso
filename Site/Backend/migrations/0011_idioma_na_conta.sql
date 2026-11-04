-- =====================================================================
-- 0011_idioma_na_conta.sql
--
-- Idioma do site na conta: o Site passa a ter português, inglês e espanhol, e a escolha acompanha a pessoa em qualquer
-- dispositivo (e não só no navegador onde ela escolheu).
--
-- Acrescenta UMA coluna a `preferencias_acessibilidade`:
--
--   `idioma`  varchar(5), nula. `pt`, `en` ou `es`. NULA significa "a conta ainda não escolheu": o Site então usa a escolha do
--   próprio aparelho (ou o idioma do navegador) e, quando a pessoa já escolheu, sobe essa escolha para cá.
--
-- Só acrescenta: nenhuma linha existente é alterada (todas ficam com `idioma` nulo) e nada é apagado. Só tem efeito depois de
-- ligar `IDIOMA_NA_CONTA_HABILITADO`; desligada, o idioma continua valendo só no aparelho.
--
-- COMO VOLTAR ATRÁS (nada depende desta coluna fora deste recurso). Desligue `IDIOMA_NA_CONTA_HABILITADO` antes:
--     ALTER TABLE public.preferencias_acessibilidade DROP CONSTRAINT IF EXISTS ck_preferencias_acessibilidade_idioma;
--     ALTER TABLE public.preferencias_acessibilidade DROP COLUMN IF EXISTS idioma;
-- =====================================================================

ALTER TABLE public.preferencias_acessibilidade
    ADD COLUMN IF NOT EXISTS idioma varchar(5);

ALTER TABLE public.preferencias_acessibilidade
    DROP CONSTRAINT IF EXISTS ck_preferencias_acessibilidade_idioma;

ALTER TABLE public.preferencias_acessibilidade
    ADD CONSTRAINT ck_preferencias_acessibilidade_idioma CHECK (idioma IS NULL OR idioma IN ('pt', 'en', 'es'));

COMMENT ON COLUMN public.preferencias_acessibilidade.idioma IS 'Idioma do site escolhido pela pessoa (pt, en, es). Nulo: ainda não escolheu.';
