-- Migration 0029: colunas ADITIVAS para CPF/CNPJ cifrados.
--
-- Não remove nem altera as colunas antigas `cpf`/`cnpj` (texto puro) —
-- decisão explícita: sem ambiente de backup/teste separado deste banco
-- compartilhado (dev = produção), remover as colunas antigas fica para uma
-- etapa futura, com backup confirmado antes.
--
-- `*_cifrado` guarda AES-256-GCM (utils/criptografia.js), recuperável em
-- texto puro pela aplicação. `*_hash` guarda SHA-256 (utils/tokens.js,
-- hashToken) do valor normalizado — determinístico, usado só para checar
-- duplicidade (o cifrado tem IV aleatório a cada chamada, não é comparável).

ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS cpf_cifrado TEXT;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS cpf_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS candidatos_cpf_hash_key ON candidatos (cpf_hash);

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cnpj_cifrado TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cnpj_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS empresas_cnpj_hash_key ON empresas (cnpj_hash);
