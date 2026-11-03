import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * O driver de e-mail de console (só desenvolvimento e teste): grava o e-mail em um arquivo em vez de enviar. Em produção ele não
 * existe — nem o `env.js` aceita subir assim, nem o `EmailService` o honra se alguém contornar.
 */

const { env } = vi.hoisted(() => ({
    env: {
        isProducao: false,
        email: { driver: "console", consoleArquivo: "" },
        brevo: { apiKey: "", remetenteEmail: "", remetenteNome: "ACESSO", timeoutMs: 1000 }
    }
}));

vi.mock("../config/env.js", () => ({ default: env }));

const { default: EmailService } = await import("./EmailService.js");

let pasta;
let arquivo;

beforeEach(() => {
    pasta = fs.mkdtempSync(path.join(os.tmpdir(), "acesso-email-"));
    arquivo = path.join(pasta, "emails.jsonl");
    env.isProducao = false;
    env.email = { driver: "console", consoleArquivo: arquivo };
    env.brevo = { apiKey: "", remetenteEmail: "", remetenteNome: "ACESSO", timeoutMs: 1000 };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(pasta, { recursive: true, force: true });
});

describe("driver de console", () => {
    it("fora de produção está disponível mesmo sem Brevo, e NÃO chama a rede", async () => {
        expect(EmailService.disponivel()).toBe(true);

        const r = await EmailService.enviar({ para: "ana@exemplo.com", assunto: "Código", html: "<p>x</p>", texto: "seu código: 123456", tag: "teste" });

        expect(r).toEqual({ enviado: true, driver: "console" });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("grava o e-mail inteiro no arquivo, uma linha JSON por e-mail", async () => {
        await EmailService.enviar({ para: "ana@exemplo.com", assunto: "Código", html: "<p>x</p>", texto: "seu código: 123456", tag: "teste" });
        await EmailService.enviar({ para: "bia@exemplo.com", assunto: "Outro", html: "<p>y</p>", texto: "t2" });

        const linhas = fs.readFileSync(arquivo, "utf8").trim().split("\n").map((l) => JSON.parse(l));

        expect(linhas).toHaveLength(2);
        expect(linhas[0]).toMatchObject({ para: "ana@exemplo.com", assunto: "Código", texto: "seu código: 123456", tag: "teste" });
        expect(linhas[1].para).toBe("bia@exemplo.com");
    });

    it("o console mostra só o endereço mascarado e o assunto: nunca o código", async () => {
        await EmailService.enviar({ para: "anabeatriz@exemplo.com", assunto: "Código", html: "x", texto: "seu código: 123456" });

        const impresso = console.log.mock.calls.map((c) => c.join(" ")).join("\n");

        expect(impresso).toContain("ana***@exemplo.com");
        expect(impresso).not.toContain("anabeatriz");
        expect(impresso).not.toContain("123456");
    });

    it("EM PRODUÇÃO: indisponível, não grava arquivo e cai no caminho do Brevo (que recusa sem chave)", async () => {
        env.isProducao = true;

        expect(EmailService.disponivel()).toBe(false);
        await expect(EmailService.enviar({ para: "ana@exemplo.com", assunto: "x", html: "x", texto: "x" })).rejects.toMatchObject({ statusCode: 503 });
        expect(fs.existsSync(arquivo)).toBe(false);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("driver não configurado: o comportamento de sempre (disponível só com Brevo completo)", () => {
        env.email = { driver: "brevo", consoleArquivo: "" };

        expect(EmailService.disponivel()).toBe(false);

        env.brevo.apiKey = "chave";
        env.brevo.remetenteEmail = "acesso@exemplo.com";

        expect(EmailService.disponivel()).toBe(true);
    });
});
