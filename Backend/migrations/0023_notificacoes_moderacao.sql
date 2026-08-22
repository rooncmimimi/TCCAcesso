-- =====================================================================
-- 0023_notificacoes_moderacao.sql
-- Nova categoria de notificação para ações de moderação administrativa,
-- separada da categoria genérica "Sistema". Não remove nenhum valor
-- existente (Sistema/Mensagem/Vaga/Candidatura/Feed).
-- =====================================================================

ALTER TYPE tipo_notificacao ADD VALUE IF NOT EXISTS 'Moderacao';
