import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { avisoDaMigracaoSeguranca, avisosDaSeguranca } from "./avisosDeAmbiente.js";

/**
 * A migration 0010 não pode ser aplicada daqui (nunca em produção a partir dos testes), então o texto é conferido. A aplicação
 * de verdade (e o rollback) foram exercitados num Postgres descartável.
 */

const sql = readFileSync(resolve(__dirname, "../../migrations/0010_dispositivos_confiaveis_e_eventos_de_seguranca.sql"), "utf8").replace(/\r\n/g, "\n");
const comandos = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

const TABELAS = ["dispositivos_confiaveis", "desafios_de_dispositivo", "links_de_seguranca", "eventos_de_seguranca"];

describe("migration 0010 (dispositivos de confiança e eventos de segurança)", () => {
    it.each(TABELAS)("cria a tabela %s, repetível (IF NOT EXISTS)", (tabela) => {
        expect(comandos).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${tabela}`));
    });

    it("só CRIA: nenhuma tabela ou dado existente é alterado, apagado ou atualizado", () => {
        expect(comandos).not.toMatch(/\b(DROP|TRUNCATE|UPDATE|INSERT)\b|(?<!ON )\bDELETE\b/i);
        expect(comandos).not.toMatch(/ALTER TABLE public\.(?!(dispositivos_confiaveis|desafios_de_dispositivo|links_de_seguranca|eventos_de_seguranca))/);
    });

    it("guarda só hashes: não existe coluna para token, código ou segredo em claro", () => {
        expect(comandos).toMatch(/token_hash\s+varchar\(64\)/);
        expect(comandos).toMatch(/codigo_hash\s+varchar\(64\)/);
        expect(comandos).not.toMatch(/^\s+(token|codigo|segredo|senha)\s+/m);
    });

    it("o token do aparelho e o do link são únicos", () => {
        expect(comandos).toMatch(/uq_dispositivos_confiaveis_token_hash UNIQUE \(token_hash\)/);
        expect(comandos).toMatch(/uq_links_de_seguranca_token_hash UNIQUE \(token_hash\)/);
    });

    it("todas apagam junto com a conta", () => {
        expect(comandos.match(/REFERENCES public\.usuarios \(id\) ON DELETE CASCADE/g)).toHaveLength(4);
    });

    it("os tipos de link são só os dois conhecidos", () => {
        expect(comandos).toMatch(/CHECK \(tipo IN \('comprometida', 'nao_fui_eu'\)\)/);
    });

    it("segue o padrão das demais: RLS ligada e sem acesso para a API pública do Supabase", () => {
        for (const tabela of TABELAS) {
            expect(comandos).toMatch(new RegExp(`ALTER TABLE public\\.${tabela}\\s+ENABLE ROW LEVEL SECURITY`));
        }
        expect(comandos).toMatch(/REVOKE ALL ON TABLE[\s\S]*FROM anon, authenticated/);
    });

    it("traz no cabeçalho como voltar atrás e manda desligar a chave antes", () => {
        expect(sql).toMatch(/COMO VOLTAR ATRÁS/);
        for (const tabela of TABELAS) expect(sql).toContain(`DROP TABLE IF EXISTS public.${tabela};`);
        expect(sql).toMatch(/Desligue `DISPOSITIVOS_CONFIAVEIS_HABILITADO`/);
    });
});

describe("avisoDaMigracaoSeguranca", () => {
    it("chave desligada: nem consulta o banco", async () => {
        let consultou = false;

        expect(await avisoDaMigracaoSeguranca({ habilitado: false, consultar: async () => ((consultou = true), []) })).toBeNull();
        expect(consultou).toBe(false);
    });

    it("tudo aplicado: sem aviso", async () => {
        expect(await avisoDaMigracaoSeguranca({ habilitado: true, consultar: async () => TABELAS })).toBeNull();
    });

    it("migration ausente (ou incompleta): lista o que falta e diz o que fazer", async () => {
        const aviso = await avisoDaMigracaoSeguranca({ habilitado: true, consultar: async () => ["links_de_seguranca"] });

        expect(aviso).toContain("0010");
        expect(aviso).toContain("dispositivos_confiaveis");
        expect(aviso).not.toContain("faltam: links_de_seguranca");
        expect(aviso).toContain("npm run migrate");
    });

    it("falha na consulta vira aviso, sem derrubar o servidor", async () => {
        const aviso = await avisoDaMigracaoSeguranca({
            habilitado: true,
            consultar: async () => {
                throw new Error("sem conexão");
            }
        });

        expect(aviso).toContain("não consegui conferir");
    });
});

describe("avisosDaSeguranca", () => {
    it("desligada: nenhum aviso", () => {
        expect(avisosDaSeguranca({ seguranca: { dispositivosHabilitado: false }, emailDisponivel: false })).toEqual([]);
    });

    it("ligada e com e-mail: nenhum aviso", () => {
        expect(avisosDaSeguranca({ seguranca: { dispositivosHabilitado: true }, emailDisponivel: true })).toEqual([]);
    });

    it("ligada SEM e-mail: avisa que a verificação está inativa (o login segue como antes)", () => {
        const [aviso, ...resto] = avisosDaSeguranca({ seguranca: { dispositivosHabilitado: true }, emailDisponivel: false });

        expect(resto).toEqual([]);
        expect(aviso).toContain("INATIVA");
        expect(aviso).toContain("BREVO_API_KEY");
    });
});

describe("a ligação com o servidor (server.js)", () => {
    const servidor = readFileSync(resolve(__dirname, "../server.js"), "utf8");

    it("confere as tabelas por pg_tables com alias (não por information_schema.tables, que o Sequelize devolve em outro formato)", () => {
        expect(servidor).toContain("avisoDaMigracaoSeguranca");
        expect(servidor).toContain("tablename AS nome FROM pg_tables");
        expect(servidor).not.toMatch(/"SELECT table_name FROM information_schema\.tables/);
    });

    it("liga a limpeza periódica só com o recurso habilitado", () => {
        expect(servidor).toMatch(/if \(DispositivoConfiavelService\.habilitado\(\)\)[\s\S]*limparAntigos/);
    });
});

describe("env.js", () => {
    const env = readFileSync(resolve(__dirname, "./env.js"), "utf8");

    it("recusa o driver de e-mail de console em produção (fecha o processo)", () => {
        expect(env).toMatch(/env\.isProducao && env\.email\.driver === "console"[\s\S]{0,500}process\.exit\(1\)/);
    });

    it("a chave nasce desligada", () => {
        expect(env).toMatch(/dispositivosHabilitado:\s*process\.env\.DISPOSITIVOS_CONFIAVEIS_HABILITADO === "true"/);
    });
});

describe("os exemplos de implantação", () => {
    it(".env.example e render.yaml trazem a chave desligada", () => {
        const exemplo = readFileSync(resolve(__dirname, "../../.env.example"), "utf8");
        const render = readFileSync(resolve(__dirname, "../../../../render.yaml"), "utf8").replace(/\r\n/g, "\n");

        expect(exemplo).toMatch(/^DISPOSITIVOS_CONFIAVEIS_HABILITADO=false/m);
        expect(render).toMatch(/key: DISPOSITIVOS_CONFIAVEIS_HABILITADO\n\s+value: "false"/);
    });
});
