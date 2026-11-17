import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * O cliente da DeepL.
 *
 * O teste que mais importa aqui é o do endereço: a DeepL tem dois, e mandar uma chave gratuita para
 * o endereço pago devolve 403 — que lido sem contexto parece "chave inválida" e manda a pessoa
 * procurar no lugar errado. O resto são os status que a tela precisa saber distinguir (cota acabou
 * não é o mesmo que serviço fora do ar) e o alinhamento da resposta com o pedido.
 *
 * A chamada de rede é simulada; nenhum teste fala com a DeepL.
 */

const { default: env } = await import("../config/env.js");
const { default: DeepLService } = await import("./DeepLService.js");

const original = { ...env.deepl };

const comTraducoes = (textos) => ({
    ok: true,
    status: 200,
    json: async () => ({ translations: textos.map((text) => ({ text, detected_source_language: "PT" })) })
});

const comStatus = (status) => ({ ok: status >= 200 && status < 300, status, json: async () => ({}) });

const corpoDaChamada = () => JSON.parse(globalThis.fetch.mock.calls[0][1].body);
const urlDaChamada = () => globalThis.fetch.mock.calls[0][0];

beforeEach(() => {
    env.deepl.apiKey = "chave-de-teste:fx";
    env.deepl.endpoint = null;
    env.deepl.timeoutMs = 10000;
    globalThis.fetch = vi.fn();
});

afterEach(() => {
    Object.assign(env.deepl, original);
    vi.restoreAllMocks();
});

describe("qual endereço a chave manda usar", () => {
    it("chave gratuita (:fx) fala com api-free.deepl.com", () => {
        env.deepl.apiKey = "abc-123:fx";

        expect(DeepLService.baseUrl()).toBe("https://api-free.deepl.com");
    });

    it("chave paga fala com api.deepl.com", () => {
        env.deepl.apiKey = "abc-123";

        expect(DeepLService.baseUrl()).toBe("https://api.deepl.com");
    });

    it("DEEPL_ENDPOINT tem precedência, e a barra do fim não duplica", () => {
        env.deepl.endpoint = "http://localhost:9999/";

        expect(DeepLService.baseUrl()).toBe("http://localhost:9999");
    });
});

describe("sem chave configurada", () => {
    it("não está disponível e nem tenta a rede", async () => {
        env.deepl.apiKey = null;

        expect(DeepLService.disponivel()).toBe(false);
        await expect(DeepLService.traduzir({ textos: ["oi"], origem: "pt", destino: "en" })).rejects.toMatchObject({ statusCode: 503 });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});

describe("o pedido", () => {
    it("manda a lista inteira numa requisição só", async () => {
        globalThis.fetch.mockResolvedValue(comTraducoes(["one", "two", "three"]));

        const saida = await DeepLService.traduzir({ textos: ["um", "dois", "três"], origem: "pt", destino: "en" });

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        expect(corpoDaChamada().text).toEqual(["um", "dois", "três"]);
        expect(saida).toEqual(["one", "two", "three"]);
    });

    it("usa a variante no destino (EN-US, PT-BR), que é o que a API pede", async () => {
        globalThis.fetch.mockResolvedValue(comTraducoes(["hello"]));

        await DeepLService.traduzir({ textos: ["olá"], origem: "pt", destino: "en" });

        expect(corpoDaChamada()).toMatchObject({ source_lang: "PT", target_lang: "EN-US" });
    });

    it("destino português pede PT-BR", async () => {
        globalThis.fetch.mockResolvedValue(comTraducoes(["olá"]));

        await DeepLService.traduzir({ textos: ["hello"], origem: "en", destino: "pt" });

        expect(corpoDaChamada()).toMatchObject({ source_lang: "EN", target_lang: "PT-BR" });
    });

    it("autentica no formato da DeepL, que não é Bearer", async () => {
        globalThis.fetch.mockResolvedValue(comTraducoes(["hello"]));

        await DeepLService.traduzir({ textos: ["olá"], origem: "pt", destino: "en" });

        expect(globalThis.fetch.mock.calls[0][1].headers.Authorization).toBe("DeepL-Auth-Key chave-de-teste:fx");
        expect(urlDaChamada()).toBe("https://api-free.deepl.com/v2/translate");
    });

    it("idioma fora dos três do Site é recusado antes da rede", async () => {
        await expect(DeepLService.traduzir({ textos: ["oi"], origem: "pt", destino: "de" })).rejects.toMatchObject({ statusCode: 400 });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});

describe("o que cada falha vira", () => {
    it("456 é cota acabada, e vira 429 para quem chamou", async () => {
        globalThis.fetch.mockResolvedValue(comStatus(456));

        await expect(DeepLService.traduzir({ textos: ["oi"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            statusCode: 429,
            message: expect.stringMatching(/cota/i)
        });
    });

    it("403 fala de chave recusada, que é o sintoma do endereço errado", async () => {
        globalThis.fetch.mockResolvedValue(comStatus(403));

        await expect(DeepLService.traduzir({ textos: ["oi"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            statusCode: 503,
            message: expect.stringMatching(/recusada/i)
        });
    });

    it("429 e 529 são serviço ocupado, não cota", async () => {
        globalThis.fetch.mockResolvedValue(comStatus(529));

        await expect(DeepLService.traduzir({ textos: ["oi"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            statusCode: 429,
            message: expect.stringMatching(/ocupado/i)
        });
    });

    it("rede caída não vaza o erro cru", async () => {
        globalThis.fetch.mockRejectedValue(new Error("ECONNREFUSED 1.2.3.4:443"));

        await expect(DeepLService.traduzir({ textos: ["oi"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            statusCode: 503,
            message: expect.not.stringContaining("ECONNREFUSED")
        });
    });

    it("tempo esgotado tem mensagem própria", async () => {
        const abortado = new Error("abortado");
        abortado.name = "AbortError";
        globalThis.fetch.mockRejectedValue(abortado);

        await expect(DeepLService.traduzir({ textos: ["oi"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            message: expect.stringMatching(/demorou/i)
        });
    });

    it("resposta com menos itens do que o pedido falha em vez de desalinhar os textos", async () => {
        // O caso perigoso: devolver [tradução de A] para [A, B] colocaria a tradução de A no lugar de B.
        globalThis.fetch.mockResolvedValue(comTraducoes(["one"]));

        await expect(DeepLService.traduzir({ textos: ["um", "dois"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            message: expect.stringMatching(/incompleta/i)
        });
    });
});

describe("consulta da cota", () => {
    it("lê o quanto foi usado e o limite", async () => {
        globalThis.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ character_count: 1234, character_limit: 500000 })
        });

        await expect(DeepLService.uso()).resolves.toEqual({ usados: 1234, limite: 500000 });
        expect(globalThis.fetch.mock.calls[0][0]).toBe("https://api-free.deepl.com/v2/usage");
    });
});
