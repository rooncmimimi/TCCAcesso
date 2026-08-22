-- =====================================================================
-- 0022_empresas_suspensa.sql
-- Adiciona o estado "suspensa" ao ciclo de aprovação de empresas.
-- Não remove nem altera os valores existentes (pendente/aprovada/reprovada).
-- =====================================================================

ALTER TYPE status_aprovacao_empresa ADD VALUE IF NOT EXISTS 'suspensa';
