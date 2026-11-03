import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";

/**
 * `POST /api/contato`, de ponta a ponta: Express, validadores, limitador de requisições e serviço reais, com
 * o envio de e-mail simulado. Cada teste usa um IP diferente (cabeçalho `X-Forwarded-For`), porque o limitador
 * conta por IP e guarda a contagem na memória do processo.
 */

vi.mock("../services/EmailService.js", () => ({ default: { disponivel: vi.fn(() => true), enviar: vi.fn(async () => {}) } }));

const { default: env } = await import("../config/env.js");
const { default: EmailService } = await import("../services/EmailService.js");
const { default: erroMiddleware } = await import("../middlewares/erroMiddleware.js");
const { default: ErroApi } = await import("../utils/ErroApi.js");
const { default: contatoRoutes } = await import("./contatoRoutes.js");

let servidor;
let base;
let contadorDeIp = 10;
const ipNovo = () => `203.0.113.${(contadorDeIp += 1)}`;

beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    env.contato.destinoEmail = "equipe@acesso.test";

    const app = express();
    app.set("trust proxy", true);
    app.use(express.json());
    app.use("/contato", contatoRoutes);
    app.use(erroMiddleware);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });
    base = `http://127.0.0.1:${servidor.address().port}`;
});

afterAll(() => {
    servidor.close();
    vi.restoreAllMocks();
});

beforeEach(() => {
    EmailService.disponivel.mockReturnValue(true);
    EmailService.enviar.mockClear();
    EmailService.enviar.mockResolvedValue(undefined);
});

const corpoValido = (extra = {}) => ({
    nome: "Maria da Silva",
    email: "maria@exemplo.com",
    assunto: "acessibilidade",
    mensagem: "O leitor de tela não anuncia o botão de candidatura na página de vagas.",
    website: "",
    ...extra
});

async function enviar(corpo, ip = ipNovo()) {
    const resposta = await fetch(`${base}/contato`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
        body: JSON.stringify(corpo)
    });
    const json = await resposta.json().catch(() => ({}));

    return { status: resposta.status, json };
}

describe("POST /contato", () => {
    it("recebe a mensagem, encaminha à equipe e devolve o protocolo", async () => {
        const r = await enviar(corpoValido());

        expect(r.status).toBe(201);
        expect(r.json.protocolo).toMatch(/^ACE-[0-9A-F]{8}$/);
        expect(EmailService.enviar).toHaveBeenCalledTimes(1);
        expect(EmailService.enviar.mock.calls[0][0]).toMatchObject({
            para: "equipe@acesso.test",
            responderPara: { email: "maria@exemplo.com" }
        });
    });

    it("não exige login", async () => {
        // Nenhum cabeçalho de autorização foi enviado em `enviar`.
        expect((await enviar(corpoValido())).status).toBe(201);
    });

    it.each([
        ["nome com número", { nome: "Maria 2" }, "nome"],
        ["e-mail inválido", { email: "isto-nao-e-email" }, "email"],
        ["assunto fora da lista", { assunto: "qualquer" }, "assunto"],
        ["mensagem curta demais", { mensagem: "oi" }, "mensagem"],
        ["mensagem longa demais", { mensagem: "a".repeat(3001) }, "mensagem"],
        ["mensagem ausente", { mensagem: undefined }, "mensagem"]
    ])("recusa %s, sem enviar nada", async (_nome, extra, campo) => {
        const r = await enviar(corpoValido(extra));

        expect(r.status).toBe(422);
        expect(JSON.stringify(r.json)).toContain(campo);
        expect(EmailService.enviar).not.toHaveBeenCalled();
    });

    it("aceita mensagem de exatamente 10 e de exatamente 3000 caracteres", async () => {
        expect((await enviar(corpoValido({ mensagem: "1234567890" }))).status).toBe(201);
        expect((await enviar(corpoValido({ mensagem: "a".repeat(3000) }))).status).toBe(201);
    });

    it("campo-isca preenchido: responde como sucesso para o robô, mas não envia", async () => {
        const r = await enviar(corpoValido({ website: "http://spam.exemplo" }));

        expect(r.status).toBe(201);
        expect(EmailService.enviar).not.toHaveBeenCalled();
    });

    it("sem envio de e-mail disponível: 503 com explicação, e não 'enviado'", async () => {
        EmailService.disponivel.mockReturnValue(false);

        const r = await enviar(corpoValido());

        expect(r.status).toBe(503);
        expect(r.json.mensagem).toContain("não está disponível");
        expect(r.json.protocolo).toBeUndefined();
    });

    it("falha no provedor: 503 e a mensagem não é dada como enviada", async () => {
        EmailService.enviar.mockRejectedValue(ErroApi.servicoIndisponivel("Não foi possível enviar o e-mail agora."));

        const r = await enviar(corpoValido());

        expect(r.status).toBe(503);
    });

    it("limita a 5 mensagens por IP por hora; a sexta recebe 429", async () => {
        const ip = ipNovo();

        for (let i = 0; i < 5; i += 1) {
            expect((await enviar(corpoValido(), ip)).status).toBe(201);
        }

        const sexta = await enviar(corpoValido(), ip);
        expect(sexta.status).toBe(429);
        expect(sexta.json.mensagem).toMatch(/Aguarde/);
        expect(EmailService.enviar).toHaveBeenCalledTimes(5);

        // Outro IP não é afetado.
        expect((await enviar(corpoValido(), ipNovo())).status).toBe(201);
    });

    it("ignora campos que não fazem parte do formulário", async () => {
        await enviar(corpoValido({ para: "alvo@exemplo.com", administrador: true, tag: "x" }));

        const envio = EmailService.enviar.mock.calls[0][0];
        expect(envio.para).toBe("equipe@acesso.test");
        expect(envio.tag).toBe("fale-conosco");
    });
});
