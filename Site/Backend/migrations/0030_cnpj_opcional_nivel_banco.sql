-- Migration 0030: torna a coluna antiga `empresas.cnpj` opcional no banco.
--
-- Necessário para a criptografia aditiva do CNPJ (migration 0029): a partir
-- de agora, gravações novas cifram o CNPJ em `cnpj_cifrado`/`cnpj_hash` e
-- deixam a coluna antiga em texto puro como NULL (nunca mais grava CNPJ em
-- texto puro). Isso não é possível com a coluna ainda NOT NULL.
--
-- Não é destrutivo: nenhuma linha existente é alterada, nenhum dado é
-- removido — só relaxa a restrição para permitir NULL em linhas futuras.
-- A obrigatoriedade do CNPJ no cadastro continua garantida na camada de
-- validação da aplicação (validators/authValidator.js), como já era.

ALTER TABLE empresas ALTER COLUMN cnpj DROP NOT NULL;
