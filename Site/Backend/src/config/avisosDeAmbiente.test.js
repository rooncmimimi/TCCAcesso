import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi } from "vitest";

import { ORIGEM_LOCAL, avisoDaMigracaoContaSemSenha, avisosDoGoogle } from "./avisosDeAmbiente.js";

/**
 * Os avisos de configuração do login com Google (achado 9 e itens de ambiente da auditoria). São
 * funções puras: nenhum teste precisa mexer em variável de ambiente.
 */

const CONFIGURADO = {
    clientId: "id-de-teste.apps.googleusercontent.com",
    clientSecret: "segredo-de-teste",
    redirectUri: "https://acesso-backend.onrender.com/api/auth/google/callback"
};
const NADA = { clientId: null, clientSecret: null, redirectUri: null };

const avisar = (google, extras = {}) =>
    avisosDoGoogle({ google, isProducao: false, corsOrigins: ["https://site.exemplo"], ...extras });

describe("login com Google configurado direito", () => {
    it("não avisa nada em desenvolvimento", () => {
        expect(avisar(CONFIGURADO)).toEqual([]);
    });

    it("não avisa nada em produção com a origem pública e o retorno na API", () => {
        expect(avisar(CONFIGURADO, { isProducao: true })).toEqual([]);
    });

    it("não avisa quando o recurso está desligado de propósito (nenhuma das três)", () => {
        expect(avisar(NADA, { isProducao: true })).toEqual([]);
    });
});

describe("configuração pela metade", () => {
    it.each([
        [["GOOGLE_CLIENT_ID"], { clientId: null }],
        [["GOOGLE_CLIENT_SECRET"], { clientSecret: null }],
        [["GOOGLE_REDIRECT_URI"], { redirectUri: null }],
        [["GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"], { clientSecret: null, redirectUri: null }]
    ])("avisa quais faltam: %j", (faltando, mudanca) => {
        const avisos = avisar({ ...CONFIGURADO, ...mudanca });

        const aviso = avisos.find((texto) => texto.includes("incompleto"));
        expect(aviso).toBeDefined();
        for (const nome of faltando) expect(aviso).toContain(nome);
    });

    it("diz o efeito: o botão some sem ninguém ser avisado", () => {
        expect(avisar({ ...CONFIGURADO, clientSecret: null })[0]).toMatch(/botão/);
    });

    it("só cita as que faltam, não as que estão preenchidas", () => {
        const aviso = avisar({ ...CONFIGURADO, clientSecret: null }).find((texto) => texto.includes("incompleto"));

        expect(aviso).not.toContain("GOOGLE_CLIENT_ID");
        expect(aviso).not.toContain("GOOGLE_REDIRECT_URI");
    });
});

describe("endereço de retorno", () => {
    it.each([
        ["https://acesso-backend.onrender.com/api/auth/google/callback"],
        ["http://localhost:3000/api/auth/google/callback"],
        ["https://acesso-backend.onrender.com/api/auth/google/callback/"]
    ])("aceita %s", (redirectUri) => {
        expect(avisar({ ...CONFIGURADO, redirectUri })).toEqual([]);
    });

    it.each([
        ["https://acesso-backend.onrender.com/api/auth/google"],
        ["https://acesso-backend.onrender.com/api/auth/google/callbackX"],
        ["https://acesso-backend.onrender.com/"]
    ])("avisa quando não termina em /auth/google/callback: %s", (redirectUri) => {
        expect(avisar({ ...CONFIGURADO, redirectUri }).join(" ")).toContain("não termina em /auth/google/callback");
    });

    it("avisa quando não é uma URL", () => {
        expect(avisar({ ...CONFIGURADO, redirectUri: "meu-backend/callback" }).join(" ")).toContain("não é uma URL absoluta");
    });
});

describe("em produção", () => {
    it.each([
        ["http://localhost:3000/api/auth/google/callback"],
        ["http://127.0.0.1:3000/api/auth/google/callback"]
    ])("avisa quando o retorno aponta para a máquina local (%s)", (redirectUri) => {
        expect(avisar({ ...CONFIGURADO, redirectUri }, { isProducao: true }).join(" ")).toContain("localhost");
    });

    it("em desenvolvimento, localhost no retorno é o normal e não avisa", () => {
        expect(avisar({ ...CONFIGURADO, redirectUri: "http://localhost:3000/api/auth/google/callback" })).toEqual([]);
    });

    it("avisa quando FRONTEND_URL lista origens locais, dizendo quantas", () => {
        const avisos = avisar(CONFIGURADO, {
            isProducao: true,
            corsOrigins: ["https://site.exemplo", "http://localhost:5173", "http://127.0.0.1:5173"]
        });

        expect(avisos).toHaveLength(1);
        expect(avisos[0]).toContain("2 origem(ns) local(is)");
    });

    it("em desenvolvimento, origem local no CORS é o normal e não avisa", () => {
        expect(avisar(CONFIGURADO, { corsOrigins: ["http://localhost:5173"] })).toEqual([]);
    });

    it("não avisa de origem local quando a lista só tem origens públicas", () => {
        expect(avisar(CONFIGURADO, { isProducao: true, corsOrigins: ["https://site.exemplo", "https://outro.exemplo"] })).toEqual([]);
    });
});

describe("os avisos não vazam valores", () => {
    it("nenhum aviso contém o ID, o segredo ou o endereço de retorno completo", () => {
        const avisos = avisar(
            { clientId: "ID-SECRETO-123", clientSecret: "SEGREDO-SECRETO-456", redirectUri: "http://localhost:3000/errado" },
            { isProducao: true, corsOrigins: ["http://localhost:5173"] }
        );

        expect(avisos.length).toBeGreaterThan(0);
        const todos = avisos.join("\n");
        expect(todos).not.toContain("ID-SECRETO-123");
        expect(todos).not.toContain("SEGREDO-SECRETO-456");
        expect(todos).not.toContain("localhost:3000/errado");
    });
});

describe("ORIGEM_LOCAL", () => {
    it.each([["http://localhost:5173"], ["https://localhost"], ["http://127.0.0.1:3000"], ["http://localhost:5173/"]])("reconhece %s", (origem) => {
        expect(ORIGEM_LOCAL.test(origem)).toBe(true);
    });

    it.each([["https://acessoinclusivo.vercel.app"], ["http://localhost.evil.com"], ["https://evil.com/localhost"], ["http://10.0.0.1:3000"]])(
        "não confunde %s com origem local",
        (origem) => {
            expect(ORIGEM_LOCAL.test(origem)).toBe(false);
        }
    );
});

// Etapa 6: a chave GOOGLE_CONTA_SEM_SENHA só pode ficar ligada com a migration 0007 aplicada.
describe("avisoDaMigracaoContaSemSenha", () => {
    it("chave desligada: não confere nada, nem pergunta ao banco", async () => {
        const consultar = vi.fn();

        expect(await avisoDaMigracaoContaSemSenha({ habilitado: false, consultar })).toBeNull();
        expect(consultar).not.toHaveBeenCalled();
    });

    it("chave ligada e a coluna já aceita nulo: tudo certo, sem aviso", async () => {
        expect(await avisoDaMigracaoContaSemSenha({ habilitado: true, consultar: async () => "YES" })).toBeNull();
    });

    it.each([["NO"], [null]])("chave ligada e a coluna é %j: avisa que a migration 0007 não foi aplicada", async (resposta) => {
        const aviso = await avisoDaMigracaoContaSemSenha({ habilitado: true, consultar: async () => resposta });

        expect(aviso).toContain("migration 0007");
        expect(aviso).toContain("npm run migrate");
    });

    it("falha na consulta: avisa que não deu para conferir, sem derrubar nada", async () => {
        const aviso = await avisoDaMigracaoContaSemSenha({
            habilitado: true,
            consultar: async () => {
                throw new Error("conexão perdida com senha=segredo");
            }
        });

        expect(aviso).toContain("não consegui conferir");
        expect(aviso).not.toContain("segredo");
    });
});

// O `render.yaml` é o que recria o serviço do zero. Sem as variáveis do Google nele, o botão
// "Continuar com Google" sumiria em silêncio; e nenhum segredo pode ter valor escrito ali.
describe("render.yaml", () => {
    // O Vitest roda na pasta do Backend (`npm test`); o render.yaml fica na raiz do repositório.
    const yaml = readFileSync(resolve(process.cwd(), "../../render.yaml"), "utf8");

    /** `[["DB_HOST", "sync: false"], ["DB_PORT", 'value: "5432"'], ...]` */
    // `\r?` e `m`: o arquivo pode ter fim de linha do Windows (CRLF).
    const variaveis = [...yaml.matchAll(/- key: (\w+)\r?\n\s+(value: .+?|sync: false|generateValue: true)\r?$/gm)].map(([, chave, forma]) => [
        chave,
        forma
    ]);
    const formaDe = (chave) => variaveis.find(([nome]) => nome === chave)?.[1];

    it.each(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"])("declara %s, sem valor (sync: false)", (chave) => {
        expect(formaDe(chave)).toBe("sync: false");
    });

    it("nenhuma variável com cara de segredo traz valor escrito", () => {
        const comValor = variaveis.filter(([chave, forma]) => /SECRET|PASSWORD|API_KEY|SERVICE_ROLE|TOKEN/.test(chave) && forma.startsWith("value:"));

        expect(comValor.map(([chave]) => chave)).toEqual([]);
    });

    it("o JWT_SECRET é gerado pelo Render, não escrito", () => {
        expect(formaDe("JWT_SECRET")).toBe("generateValue: true");
    });
});
