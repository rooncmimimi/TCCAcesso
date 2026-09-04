-- =====================================================================
-- 0042_consentimento_voz_nullable.sql
-- Fase 9, Bloco 8: `consentimento_voz` precisa representar um terceiro
-- estado ("ainda não respondeu"), distinto de "respondeu que não". A
-- coluna hoje é NOT NULL DEFAULT FALSE, então esse terceiro estado é
-- estruturalmente impossível — todo usuário nasce "false", indistinguível
-- de quem realmente recusou o consentimento de voz.
--
-- Esta migration só relaxa a constraint (permite NULL, remove o default
-- fixo em FALSE). NÃO apaga nem reescreve nenhuma linha existente — as
-- 3 linhas reais hoje na tabela continuam com `false` depois de rodar
-- isto (ver nota "DADOS EXISTENTES" no relatório do Bloco 8: eram todas
-- valores nunca respondidos de verdade, porque o campo nunca esteve
-- conectado ao frontend antes deste bloco — o relatório oferece a opção
-- de zerá-las para NULL também, mas isso é uma decisão separada, não
-- parte desta migration).
-- =====================================================================

ALTER TABLE public.preferencias_acessibilidade
    ALTER COLUMN consentimento_voz DROP NOT NULL,
    ALTER COLUMN consentimento_voz DROP DEFAULT;
