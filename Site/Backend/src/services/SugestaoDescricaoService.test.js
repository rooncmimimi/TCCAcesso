import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * A sugestão de descrição: o idioma do pedido, a limpeza do texto e a recusa do que não é
 * descrição. A chamada de rede é simulada; nenhum teste fala com a OpenRouter.
 *
 * O teste mais importante aqui é o do capacete: a regra antiga recusava qualquer resposta que
 * contivesse a palavra "safety", e "a safety helmet" é descrição legítima em inglês. Quem depende
 * de descrição alternativa para ler o site era justamente quem perdia o recurso.
 */

const { default: env } = await import("../config/env.js");
const { default: SugestaoDescricaoService } = await import("./SugestaoDescricaoService.js");

const original = { ...env.openRouter };
const IMAGEM = Buffer.from("imagem-falsa-de-teste");

const comTexto = (content) => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content }, finish_reason: "stop" }] })
});

const promptEnviado = (indice = 0) =>
    JSON.parse(globalThis.fetch.mock.calls[indice][1].body).messages[0].content[0].text;

beforeEach(() => {
    env.openRouter.apiKey = "chave-de-teste";
    env.openRouter.models = ["modelo/a:free", "modelo/b:free"];
    env.openRouter.timeoutMs = 15000;
    env.openRouter.orcamentoMs = 40000;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    Object.assign(env.openRouter, original);
    vi.restoreAllMocks();
});

describe("SugestaoDescricaoService: idioma", () => {
    it("pede a descrição no idioma do Site", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Dos personas conversando en una mesa."));

        await SugestaoDescricaoService.sugerir(IMAGEM, "image/png", "es");

        expect(promptEnviado()).toMatch(/Responde en español/);
    });

    it("inglês pede em inglês", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Two people talking at a table."));

        await SugestaoDescricaoService.sugerir(IMAGEM, "image/png", "en");

        expect(promptEnviado()).toMatch(/Answer in English/);
    });

    it("idioma desconhecido cai no português, sem falhar", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Duas pessoas conversando numa mesa."));

        const descricao = await SugestaoDescricaoService.sugerir(IMAGEM, "image/png", "tlh");

        expect(promptEnviado()).toMatch(/português do Brasil/);
        expect(descricao).toBe("Duas pessoas conversando numa mesa.");
    });

    it("sem idioma, português", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Uma cadeira de rodas ao lado de uma mesa."));

        await SugestaoDescricaoService.sugerir(IMAGEM, "image/png");

        expect(promptEnviado()).toMatch(/português do Brasil/);
    });

    it("as regras de privacidade vão nos três idiomas", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Uma porta aberta num corredor."));

        for (const [idioma, padrao] of [
            ["pt", /Nunca infira ou mencione deficiência/],
            ["en", /Never infer or mention disability/],
            ["es", /Nunca infieras ni menciones discapacidad/]
        ]) {
            globalThis.fetch.mockClear();
            await SugestaoDescricaoService.sugerir(IMAGEM, "image/png", idioma);
            expect(promptEnviado()).toMatch(padrao);
        }
    });
});

describe("SugestaoDescricaoService: limpeza do texto", () => {
    it("tira as aspas que o modelo põe em volta", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto('"Uma bicicleta apoiada num muro."'));

        expect(await SugestaoDescricaoService.sugerir(IMAGEM, "image/png")).toBe(
            "Uma bicicleta apoiada num muro."
        );
    });

    it("tira o prefixo em vez de recusar a resposta", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("Descrição: um gato dormindo no sofá."));

        expect(await SugestaoDescricaoService.sugerir(IMAGEM, "image/png")).toBe("Um gato dormindo no sofá.");
        // Uma tentativa só: a resposta era boa, só estava com enfeite.
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("tira o prefixo em inglês e em espanhol também", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(comTexto("Alt text: A dog on the sidewalk."))
            .mockResolvedValueOnce(comTexto("Descripción: Un perro en la acera."));

        expect(await SugestaoDescricaoService.sugerir(IMAGEM, "image/png", "en")).toBe("A dog on the sidewalk.");
        expect(await SugestaoDescricaoService.sugerir(IMAGEM, "image/png", "es")).toBe("Un perro en la acera.");
    });

    it("tira markdown, que leitor de tela leria em voz alta", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("**Uma ponte** sobre um *rio* largo."));

        expect(await SugestaoDescricaoService.sugerir(IMAGEM, "image/png")).toBe("Uma ponte sobre um rio largo.");
    });

    it("corta em 500 caracteres sem partir palavra no meio", async () => {
        const longa = `${"palavra ".repeat(100)}fim.`;
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto(longa));

        const descricao = await SugestaoDescricaoService.sugerir(IMAGEM, "image/png");

        expect(descricao.length).toBeLessThanOrEqual(500);
        expect(descricao.endsWith("palavra")).toBe(true);
    });
});

describe("SugestaoDescricaoService: o que não é descrição", () => {
    it("recusa a saída de classificador de moderação e tenta o próximo modelo", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(comTexto("User Safety: safe"))
            .mockResolvedValueOnce(comTexto("Uma sala com uma estante de livros."));

        expect(await SugestaoDescricaoService.sugerir(IMAGEM, "image/png")).toBe(
            "Uma sala com uma estante de livros."
        );
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("recusa recusa de modelo (em qualquer um dos três idiomas)", async () => {
        for (const recusa of [
            "I'm sorry, I cannot help with that.",
            "Não posso ajudar com isso.",
            "Lo siento, no puedo ayudar con eso."
        ]) {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto(recusa));

            await expect(SugestaoDescricaoService.sugerir(IMAGEM, "image/png")).rejects.toThrow();
            vi.restoreAllMocks();
            vi.spyOn(console, "error").mockImplementation(() => {});
        }
    });

    it("ACEITA descrição legítima que contém palavra de segurança", async () => {
        // A regra antiga recusava por causa de "safety" e "blocked", e as duas aparecem em
        // descrição de verdade.
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            comTexto("A worker wearing a safety helmet in front of a blocked doorway.")
        );

        expect(await SugestaoDescricaoService.sugerir(IMAGEM, "image/png", "en")).toBe(
            "A worker wearing a safety helmet in front of a blocked doorway."
        );
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("recusa resposta de uma palavra só", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("imagem"));

        await expect(SugestaoDescricaoService.sugerir(IMAGEM, "image/png")).rejects.toThrow();
    });

    it("quando nenhum modelo serve, a mensagem oferece escrever à mão", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(comTexto("User Safety: safe"));

        await expect(SugestaoDescricaoService.sugerir(IMAGEM, "image/png")).rejects.toThrow(/manualmente/i);
    });
});

describe("SugestaoDescricaoService.disponivel", () => {
    it("falso sem chave, verdadeiro com chave", () => {
        env.openRouter.apiKey = null;
        expect(SugestaoDescricaoService.disponivel()).toBe(false);

        env.openRouter.apiKey = "chave-de-teste";
        expect(SugestaoDescricaoService.disponivel()).toBe(true);
    });
});
