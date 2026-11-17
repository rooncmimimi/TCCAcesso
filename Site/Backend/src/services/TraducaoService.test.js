import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O cache de tradução. O que estes testes protegem é o motivo de ele existir: **o mesmo texto não
 * pode ser traduzido duas vezes**. Se um dia alguém quebrar isso, a cota do mês some numa tarde e o
 * botão "Traduzir" morre para todo mundo até o dia 1.
 *
 * Banco e DeepL mockados; nenhum teste fala com a rede nem com o Postgres.
 */

const m = vi.hoisted(() => ({
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    update: vi.fn(),
    sum: vi.fn(),
    traduzir: vi.fn(),
    disponivel: vi.fn()
}));

vi.mock("../models/index.js", () => ({
    Traducao: { findAll: m.findAll, bulkCreate: m.bulkCreate, update: m.update, sum: m.sum }
}));

vi.mock("./DeepLService.js", () => ({
    default: { traduzir: m.traduzir, disponivel: m.disponivel },
    IDIOMAS_ACEITOS: ["pt", "en", "es"]
}));

const { default: env } = await import("../config/env.js");
const { default: TraducaoService, hashDoTexto } = await import("./TraducaoService.js");

const original = { ...env.deepl };

/** Uma linha do banco, como `findAll` devolveria. */
const guardada = (texto, traducao, origem = "pt", destino = "en") => ({
    hash: hashDoTexto(texto, origem, destino),
    texto: traducao
});

const textosEnviados = () => m.traduzir.mock.calls[0][0].textos;

beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(env.deepl, original);
    env.deepl.maximoDeTextos = 10;
    env.deepl.maximoDeCaracteres = 6000;
    env.deepl.orcamentoMensal = 450000;
    m.disponivel.mockReturnValue(true);
    m.findAll.mockResolvedValue([]);
    m.bulkCreate.mockResolvedValue([]);
    m.update.mockResolvedValue([0]);
    m.sum.mockResolvedValue(0);
});

describe("a chave do cache", () => {
    it("o mesmo texto e o mesmo par de idiomas dão o mesmo hash", () => {
        expect(hashDoTexto("Boa tarde", "pt", "en")).toBe(hashDoTexto("Boa tarde", "pt", "en"));
    });

    it("mudar o texto muda o hash — é isto que faz a publicação editada não servir tradução velha", () => {
        expect(hashDoTexto("Boa tarde", "pt", "en")).not.toBe(hashDoTexto("Boa tarde!", "pt", "en"));
    });

    it("o mesmo texto para idiomas diferentes são linhas diferentes", () => {
        expect(hashDoTexto("Boa tarde", "pt", "en")).not.toBe(hashDoTexto("Boa tarde", "pt", "es"));
    });
});

describe("o que já está guardado não é traduzido de novo", () => {
    it("tudo no cache: a DeepL nem é chamada", async () => {
        m.findAll.mockResolvedValue([guardada("Boa tarde", "Good afternoon")]);

        const saida = await TraducaoService.traduzir({ textos: ["Boa tarde"], origem: "pt", destino: "en" });

        expect(m.traduzir).not.toHaveBeenCalled();
        expect(saida.textos).toEqual(["Good afternoon"]);
        expect(saida.doCache).toBe(1);
    });

    it("metade no cache: só o que falta vai para a DeepL, e a ordem da resposta se mantém", async () => {
        m.findAll.mockResolvedValue([guardada("Boa tarde", "Good afternoon")]);
        m.traduzir.mockResolvedValue(["Good morning"]);

        const saida = await TraducaoService.traduzir({ textos: ["Boa tarde", "Bom dia"], origem: "pt", destino: "en" });

        expect(textosEnviados()).toEqual(["Bom dia"]);
        expect(saida.textos).toEqual(["Good afternoon", "Good morning"]);
        expect(saida.doCache).toBe(1);
    });

    it("texto repetido no mesmo pedido é traduzido uma vez só", async () => {
        m.traduzir.mockResolvedValue(["Good afternoon"]);

        const saida = await TraducaoService.traduzir({ textos: ["Boa tarde", "Boa tarde"], origem: "pt", destino: "en" });

        expect(textosEnviados()).toEqual(["Boa tarde"]);
        expect(saida.textos).toEqual(["Good afternoon", "Good afternoon"]);
    });

    it("o que foi traduzido é gravado, com o tamanho do original", async () => {
        m.traduzir.mockResolvedValue(["Good afternoon"]);

        await TraducaoService.traduzir({ textos: ["Boa tarde"], origem: "pt", destino: "en" });

        expect(m.bulkCreate).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    hash: hashDoTexto("Boa tarde", "pt", "en"),
                    idiomaOrigem: "pt",
                    idiomaDestino: "en",
                    texto: "Good afternoon",
                    caracteres: "Boa tarde".length
                })
            ],
            { ignoreDuplicates: true }
        );
    });

    it("gravar em duplicado não derruba o pedido de quem está esperando", async () => {
        // Duas pessoas pedindo a mesma tradução ao mesmo tempo: as duas acham o cache vazio.
        m.traduzir.mockResolvedValue(["Good afternoon"]);
        m.bulkCreate.mockRejectedValue(new Error("duplicate key value violates unique constraint"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(TraducaoService.traduzir({ textos: ["Boa tarde"], origem: "pt", destino: "en" })).resolves.toMatchObject({
            textos: ["Good afternoon"]
        });
    });
});

describe("texto em branco", () => {
    it("volta como está, sem cache e sem gastar cota", async () => {
        const saida = await TraducaoService.traduzir({ textos: ["", "   "], origem: "pt", destino: "en" });

        expect(m.traduzir).not.toHaveBeenCalled();
        expect(m.findAll).not.toHaveBeenCalled();
        expect(saida.textos).toEqual(["", "   "]);
    });

    it("misturado com texto de verdade, só o de verdade é traduzido", async () => {
        m.traduzir.mockResolvedValue(["Good afternoon"]);

        const saida = await TraducaoService.traduzir({ textos: ["", "Boa tarde"], origem: "pt", destino: "en" });

        expect(textosEnviados()).toEqual(["Boa tarde"]);
        expect(saida.textos).toEqual(["", "Good afternoon"]);
    });
});

describe("o que é recusado antes de custar qualquer coisa", () => {
    const recusa = (entrada) => TraducaoService.traduzir({ textos: ["oi"], origem: "pt", destino: "en", ...entrada });

    it("lista vazia", async () => {
        await expect(recusa({ textos: [] })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("algo que não é texto", async () => {
        await expect(recusa({ textos: [{ truque: true }] })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("textos demais num pedido só", async () => {
        env.deepl.maximoDeTextos = 2;

        await expect(recusa({ textos: ["a", "b", "c"] })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("caracteres demais somando tudo", async () => {
        env.deepl.maximoDeCaracteres = 10;

        await expect(recusa({ textos: ["a".repeat(11)] })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("idioma que o Site não tem", async () => {
        await expect(recusa({ destino: "de" })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("origem igual ao destino", async () => {
        await expect(recusa({ destino: "pt" })).rejects.toMatchObject({ statusCode: 400 });
    });

    it("nenhuma dessas chega a tocar no banco ou na DeepL", async () => {
        await expect(recusa({ textos: [] })).rejects.toThrow();

        expect(m.findAll).not.toHaveBeenCalled();
        expect(m.traduzir).not.toHaveBeenCalled();
    });
});

describe("o teto do mês", () => {
    it("com a cota estourada, recusa antes de chamar a DeepL", async () => {
        env.deepl.orcamentoMensal = 1000;
        m.sum.mockResolvedValue(999);

        await expect(TraducaoService.traduzir({ textos: ["Boa tarde"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            statusCode: 429,
            message: expect.stringMatching(/cota/i)
        });

        expect(m.traduzir).not.toHaveBeenCalled();
    });

    it("o que vem do cache NÃO conta para o teto: cota esgotada ainda serve o que já foi traduzido", async () => {
        env.deepl.orcamentoMensal = 1;
        m.sum.mockResolvedValue(999999);
        m.findAll.mockResolvedValue([guardada("Boa tarde", "Good afternoon")]);

        await expect(TraducaoService.traduzir({ textos: ["Boa tarde"], origem: "pt", destino: "en" })).resolves.toMatchObject({
            textos: ["Good afternoon"]
        });
    });

    it("teto em 0 desliga a conta", async () => {
        env.deepl.orcamentoMensal = 0;
        m.sum.mockResolvedValue(999999);
        m.traduzir.mockResolvedValue(["Good afternoon"]);

        await expect(TraducaoService.traduzir({ textos: ["Boa tarde"], origem: "pt", destino: "en" })).resolves.toMatchObject({
            textos: ["Good afternoon"]
        });
        expect(m.sum).not.toHaveBeenCalled();
    });
});

describe("sem chave de tradução no servidor", () => {
    it("responde indisponível, para o Site cair na reserva", async () => {
        m.disponivel.mockReturnValue(false);

        await expect(TraducaoService.traduzir({ textos: ["Boa tarde"], origem: "pt", destino: "en" })).rejects.toMatchObject({
            statusCode: 503
        });
    });
});
