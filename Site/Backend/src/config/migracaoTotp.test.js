import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A migration 0008 não pode ser aplicada daqui (nunca em produção a partir dos testes), então este teste
 * confere o que ela promete no texto. A aplicação de verdade foi conferida num Postgres descartável.
 */

const sql = readFileSync(resolve(__dirname, "../../migrations/0008_totp_e_mfa_na_sessao.sql"), "utf8").replace(/\r\n/g, "\n");

describe("migration 0008 (TOTP)", () => {
    it("cria as duas tabelas, ligadas à conta e apagadas junto com ela", () => {
        expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.autenticacao_totp/);
        expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.codigos_recuperacao_totp/);
        expect(sql.match(/REFERENCES public\.usuarios \(id\) ON DELETE CASCADE/g)).toHaveLength(2);
    });

    it("guarda o segredo só cifrado e os códigos só como hash, sem nenhuma coluna em claro", () => {
        expect(sql).toMatch(/segredo_cifrado\s+text NOT NULL/);
        expect(sql).toMatch(/codigo_hash\s+varchar\(64\) NOT NULL/);
        expect(sql).not.toMatch(/\bsegredo\s+(text|varchar)/);
        expect(sql).not.toMatch(/\bcodigo\s+(text|varchar)/);
    });

    it("um código de recuperação não se repete e um TOTP por conta (chave primária)", () => {
        expect(sql).toMatch(/PRIMARY KEY \(usuario_id\)/);
        expect(sql).toMatch(/UNIQUE \(codigo_hash\)/);
    });

    it("acrescenta à sessão o momento da verificação, sem derrubar nada existente", () => {
        expect(sql).toMatch(/ALTER TABLE public\.sessoes\s+ADD COLUMN IF NOT EXISTS mfa_verificado_em timestamptz/);
        expect(sql).not.toMatch(/DROP COLUMN(?! IF EXISTS mfa_verificado_em)/);
    });

    it("fecha as tabelas para a API pública do Supabase (RLS ligada e permissões tiradas)", () => {
        for (const tabela of ["autenticacao_totp", "codigos_recuperacao_totp"]) {
            expect(sql).toContain(`ALTER TABLE public.${tabela} ENABLE ROW LEVEL SECURITY;`);
            expect(sql).toContain(`REVOKE ALL ON TABLE public.${tabela} FROM anon, authenticated;`);
        }
    });

    it("é repetível (IF NOT EXISTS) e traz no cabeçalho como voltar atrás", () => {
        expect(sql).toMatch(/COMO VOLTAR ATRÁS/);
        expect(sql).toMatch(/DROP TABLE IF EXISTS public\.autenticacao_totp/);
        expect(sql).not.toMatch(/^\s*DROP TABLE(?! IF EXISTS)/m);
    });

    it("não toca nos dados das contas existentes", () => {
        expect(sql).not.toMatch(/\b(UPDATE|DELETE FROM|TRUNCATE)\b\s+public\.usuarios/i);
    });
});
