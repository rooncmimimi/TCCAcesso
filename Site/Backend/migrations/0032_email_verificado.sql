-- Migration 0032: verificação de e-mail no cadastro (aditiva).
--
-- Adiciona `email_verificado` em `usuarios`. DEFAULT TRUE no nível do banco
-- para não quebrar nenhuma conta já existente (login continua funcionando
-- normalmente para quem já tinha conta antes desta migration — "grandfathered").
-- O código da aplicação (AuthService.registerCandidate/registerCompany) passa
-- a gravar `emailVerificado: false` explicitamente só para cadastros NOVOS,
-- que passam a exigir confirmação por e-mail antes do primeiro login.
--
-- Reaproveita a tabela `codigos_verificacao_email` (migration 0018) que já
-- existia para confirmar troca de e-mail — o mesmo código de 6 dígitos serve
-- para "confirme que este e-mail é seu", seja no cadastro ou numa troca.
-- Nenhuma tabela nova é necessária.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT TRUE;
