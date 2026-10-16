import { describe, it, expect, vi } from "vitest";

vi.mock("./env.js", () => ({
    default: { security: { corsOrigins: ["http://localhost:5173", "https://site.exemplo"] } }
}));

const { verificarOrigem, opcoesCors } = await import("./cors.js");

/** Chama a função `origin` do `cors` e devolve o que ela respondeu. */
const consultar = (origem) => {
    const callback = vi.fn();
    verificarOrigem(origem, callback);
    return callback.mock.calls[0];
};

describe("verificarOrigem", () => {
    it.each(["http://localhost:5173", "https://site.exemplo"])("aceita a origem da lista (%s)", (origem) => {
        expect(consultar(origem)).toEqual([null, true]);
    });

    it("aceita quem não manda Origin (curl, app Android)", () => {
        expect(consultar(undefined)).toEqual([null, true]);
    });

    it.each([
        ["https://evil.example"],
        ["https://site.exemplo.evil.com"],
        ["https://site.exemplo/"],
        ["http://site.exemplo"],
        ["null"]
    ])("recusa %s com 403, e não com 500", (origem) => {
        const [erro] = consultar(origem);

        expect(erro).toMatchObject({ statusCode: 403, message: "Origem não permitida pelo CORS." });
    });

    it("o erro é um ErroApi (o erroMiddleware o responde com o status dele)", () => {
        const [erro] = consultar("https://evil.example");

        expect(erro.isOperational).toBe(true);
        expect(erro.name).toBe("ApiError");
    });
});

describe("opcoesCors", () => {
    it("usa a verificação acima e permite credenciais", () => {
        expect(opcoesCors.origin).toBe(verificarOrigem);
        expect(opcoesCors.credentials).toBe(true);
    });
});
