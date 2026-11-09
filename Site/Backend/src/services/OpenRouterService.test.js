import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * O cliente da OpenRouter: um pedido POR MODELO, raciocínio desligado e troca de modelo quando a
 * resposta não serve. Cada teste aqui é uma falha que já aconteceu de verdade na tela:
 *
 * - o modelo de raciocínio gastava os 150 tokens pensando e devolvia `content` vazio;
 * - o primeiro id da lista ("minimax/minimax-m3:free") não existia mais;
 * - a resposta vinha 200 com um erro dentro;
 * - a resposta vinha, mas não era uma descrição.
 *
 * A chamada de rede é simulada; nenhum teste fala com a OpenRouter.
 */

const { default: env } = await import("../config/env.js");
const { default: OpenRouterService } = await import("./OpenRouterService.js");

const original = { ...env.openRouter };
const IMAGEM = Buffer.from("imagem-falsa-de-teste");

/** Resposta 200 com texto, como a da OpenRouter. */
const comTexto = (content, extra = {}) => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content }, finish_reason: "stop" }], ...extra })
});

/** 200 com `content` vazio porque o modelo gastou o orçamento raciocinando. */
const gastouNoRaciocinio = () => ({
    ok: true,
    status: 200,
    json: async () => ({
        choices: [{ message: { content: "" }, finish_reason: "length" }],
        usage: { completion_tokens: 402, completion_tokens_details: { reasoning_tokens: 401 } }
    })
});

const comStatus = (status, corpo = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo
});

const corpoDaChamada = (indice) => JSON.parse(globalThis.fetch.mock.calls[indice][1].body);
const modelosChamados = () => globalThis.fetch.mock.calls.map((c) => JSON.parse(c[1].body).model);

beforeEach(() => {
    env.openRouter.apiKey = "chave-de-teste";
    env.openRouter.models = ["modelo/a:free", "modelo/b:free", "modelo/c:free"];
    env.openRouter.timeoutMs = 15000;
    env.openRouter.orcamentoMs = 40000;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    Object.assign(env.openRouter, original);
    vi.restoreAllMocks();
});

describe("OpenRouterService: o pedido", () => {
    it("manda um modelo por pedido, e não a lista inteira", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Duas pessoas conversando numa mesa."));

        await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        expect(corpoDaChamada(0).model).toBe("modelo/a:free");
        expect(corpoDaChamada(0)).not.toHaveProperty("models");
    });

    it("desliga o raciocínio e deixa o orçamento de tokens folgado", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Um gato dormindo no sofá."));

        await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        const corpo = corpoDaChamada(0);
        expect(corpo.reasoning).toEqual({ enabled: false });
        // 150 era o valor antigo, e era o que fazia o modelo de raciocínio devolver texto vazio.
        expect(corpo.max_tokens).toBeGreaterThan(150);
    });

    it("manda a imagem como data URL com o mimetype recebido", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Uma praça com bancos de madeira."));

        await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/webp", "descreva");

        const url = corpoDaChamada(0).messages[0].content[1].image_url.url;
        expect(url).toBe(`data:image/webp;base64,${IMAGEM.toString("base64")}`);
    });

    it("identifica a aplicação nos cabeçalhos, sem dado de ninguém", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Uma bicicleta apoiada num muro."));

        await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        const cabecalhos = globalThis.fetch.mock.calls[0][1].headers;
        expect(cabecalhos.Authorization).toBe("Bearer chave-de-teste");
        expect(cabecalhos["X-Title"]).toBe("ACESSO");
    });
});

describe("OpenRouterService: troca de modelo", () => {
    it("passa ao próximo quando o modelo gasta o orçamento raciocinando", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(gastouNoRaciocinio())
            .mockResolvedValueOnce(comTexto("Uma criança soltando pipa."));

        const { texto, modelo } = await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        expect(texto).toBe("Uma criança soltando pipa.");
        expect(modelo).toBe("modelo/b:free");
        expect(modelosChamados()).toEqual(["modelo/a:free", "modelo/b:free"]);
    });

    it("passa ao próximo quando o id do modelo não existe mais", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(comStatus(400, { error: { message: "modelo/a:free is not a valid model ID" } }))
            .mockResolvedValueOnce(comTexto("Uma mesa com três cadeiras."));

        const { texto } = await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        expect(texto).toBe("Uma mesa com três cadeiras.");
    });

    it("passa ao próximo quando o erro vem dentro de um 200", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(comStatus(200, { error: { message: "Provider returned error" } }))
            .mockResolvedValueOnce(comTexto("Um cachorro na calçada."));

        const { texto } = await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        expect(texto).toBe("Um cachorro na calçada.");
    });

    it("passa ao próximo quando quem chamou recusa a resposta", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(comTexto("User Safety: safe"))
            .mockResolvedValueOnce(comTexto("Uma sala com uma estante de livros."));

        const { texto } = await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva", {
            aceitar: (t) => !t.toLowerCase().includes("user safety")
        });

        expect(texto).toBe("Uma sala com uma estante de livros.");
    });

    it("entende `content` em lista de partes, não só texto puro", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                choices: [
                    {
                        message: { content: [{ type: "text", text: "Uma ponte sobre um rio." }] },
                        finish_reason: "stop"
                    }
                ]
            })
        });

        const { texto } = await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        expect(texto).toBe("Uma ponte sobre um rio.");
    });

    it("para na primeira resposta boa, sem gastar os outros modelos", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Uma janela aberta."));

        await OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva");

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
});

describe("OpenRouterService: quando nada funciona", () => {
    it("chave recusada para de tentar na hora e diz o que é", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comStatus(401));

        await expect(OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva")).rejects.toThrow(
            /chave do serviço/i
        );
        // Não insiste nos outros: a chave é a mesma para todos.
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("sem crédito também para na hora", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comStatus(402));

        await expect(OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva")).rejects.toThrow(
            /cota do serviço gratuito/i
        );
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("limite em todos os modelos vira a mensagem de limite", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comStatus(429));

        await expect(OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva")).rejects.toThrow(
            /Limite de uso/i
        );
        expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    it("tempo esgotado em todos vira a mensagem de tempo", async () => {
        const abortado = Object.assign(new Error("abortado"), { name: "AbortError" });
        vi.spyOn(globalThis, "fetch").mockRejectedValue(abortado);

        await expect(OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva")).rejects.toThrow(
            /a tempo/i
        );
    });

    it("mistura de motivos vira a mensagem geral, que oferece escrever à mão", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(comStatus(429))
            .mockResolvedValueOnce(gastouNoRaciocinio())
            .mockResolvedValueOnce(comStatus(500));

        await expect(OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva")).rejects.toThrow(
            /manualmente/i
        );
    });

    it("sem chave configurada, nem tenta", async () => {
        env.openRouter.apiKey = null;
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("não deveria chegar aqui"));

        await expect(OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva")).rejects.toThrow(
            /não está configurada/i
        );
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("sem buffer de imagem, erro de requisição — e não um 500 sem explicação", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("não deveria chegar aqui"));

        // Era o que acontecia quando o upload ia para disco: `req.file.buffer` vinha `undefined`.
        await expect(OpenRouterService.gerarTextoSobreImagem(undefined, "image/png", "descreva")).rejects.toMatchObject(
            { statusCode: 400 }
        );
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("respeita o orçamento de tempo: não tenta um modelo que não caberia", async () => {
        env.openRouter.orcamentoMs = 1000; // menor que o mínimo para uma tentativa
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("não deveria chegar aqui"));

        await expect(OpenRouterService.gerarTextoSobreImagem(IMAGEM, "image/png", "descreva")).rejects.toThrow();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});
