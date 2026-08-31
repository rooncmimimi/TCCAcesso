-- Migration 0031: remoção DESTRUTIVA das colunas antigas de CPF/CNPJ em
-- texto puro.
--
-- Autorização explícita do usuário (28/08/2026): os dados atualmente nas
-- colunas `candidatos.cpf` e `empresas.cnpj` são exclusivamente de teste e
-- podem ser descartados. Sem necessidade de backup prévio.
--
-- `cpf_cifrado`/`cpf_hash` e `cnpj_cifrado`/`cnpj_hash` (migration 0029) já
-- são a fonte de verdade — nenhum dado real se perde aqui, só a cópia em
-- texto puro que nunca deveria ter continuado existindo.
--
-- O DROP COLUMN do Postgres já remove sozinho qualquer constraint/índice
-- que dependa só dessa coluna (ex.: a UNIQUE original de `cpf`/`cnpj`) —
-- não é necessário um DROP CONSTRAINT separado antes.
--
-- Não afeta `cpf_cifrado`, `cpf_hash`, `cnpj_cifrado`, `cnpj_hash`,
-- `exclusiva_pcd` nem nenhuma outra coluna.

ALTER TABLE candidatos DROP COLUMN IF EXISTS cpf;
ALTER TABLE empresas DROP COLUMN IF EXISTS cnpj;
