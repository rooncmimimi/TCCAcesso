import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * `EmailService.enviar` com `responderPara`: vira o `replyTo` da API da Brevo, e some quando não é passado
 * (os e-mails de sempre não mudam). A chamada de rede é simulada.
 */

const { default: env } = await import("../config/env.js");
const { default: EmailService } = await import("./EmailService.js");

const original = { ...env.brevo };

beforeEach(() => {
    env.brevo.apiKey = "chave-de-teste";
    env.brevo.remetenteEmail = "no-reply@acesso.test";
    env.brevo.remetenteNome = "ACESSO";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true });
    vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
    Object.assign(env.brevo, original);
    vi.restoreAllMocks();
});

const corpoEnviado = () => JSON.parse(globalThis.fetch.mock.calls[0][1].body);

describe("EmailService.enviar: responderPara", () => {
    it("manda o endereço de resposta como replyTo", async () => {
        await EmailService.enviar({
            para: "equipe@acesso.test",
            assunto: "Assunto",
            html: "<p>oi</p>",
            texto: "oi",
            responderPara: { email: "maria@exemplo.com", nome: "Maria da Silva" }
        });

        expect(corpoEnviado().replyTo).toEqual({ email: "maria@exemplo.com", name: "Maria da Silva" });
        expect(corpoEnviado().sender).toEqual({ email: "no-reply@acesso.test", name: "ACESSO" });
    });

    it("sem responderPara, os e-mails de sempre saem sem replyTo", async () => {
        await EmailService.enviar({ para: "pessoa@exemplo.com", assunto: "Assunto", html: "<p>oi</p>" });

        expect(corpoEnviado()).not.toHaveProperty("replyTo");
    });

    it("sem nome, o replyTo leva só o e-mail", async () => {
        await EmailService.enviar({ para: "a@b.test", assunto: "x", html: "x", responderPara: { email: "maria@exemplo.com" } });

        expect(corpoEnviado().replyTo.email).toBe("maria@exemplo.com");
        expect(corpoEnviado().replyTo.name).toBeUndefined();
    });
});
