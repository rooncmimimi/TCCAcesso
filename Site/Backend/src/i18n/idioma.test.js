import { describe, it, expect } from "vitest";
import {
    IDIOMAS,
    adotarIdiomaDaConta,
    ehIdioma,
    executarComIdioma,
    idiomaAtual,
    idiomaDoCabecalho,
    idiomaDoDestinatario,
    idiomaFoiPedido
} from "./idioma.js";

describe("idiomaDoCabecalho", () => {
    it("reconhece os três idiomas, com ou sem região", () => {
        expect(idiomaDoCabecalho("pt")).toBe("pt");
        expect(idiomaDoCabecalho("pt-BR")).toBe("pt");
        expect(idiomaDoCabecalho("pt-PT")).toBe("pt");
        expect(idiomaDoCabecalho("en")).toBe("en");
        expect(idiomaDoCabecalho("en-US")).toBe("en");
        expect(idiomaDoCabecalho("es-419")).toBe("es");
        expect(idiomaDoCabecalho("ES")).toBe("es");
    });

    it("respeita a ordem de preferência (q) e ignora idiomas que a plataforma não tem", () => {
        expect(idiomaDoCabecalho("fr-FR,fr;q=0.9,en;q=0.8,pt;q=0.7")).toBe("en");
        expect(idiomaDoCabecalho("en;q=0.5,es;q=0.9")).toBe("es");
        expect(idiomaDoCabecalho("pt;q=0.4, en;q=0.4")).toBe("pt");
    });

    it("descarta idioma com q=0 (recusado explicitamente)", () => {
        expect(idiomaDoCabecalho("en;q=0, es;q=0.5")).toBe("es");
    });

    it("devolve null quando não há o que usar", () => {
        expect(idiomaDoCabecalho(undefined)).toBeNull();
        expect(idiomaDoCabecalho("")).toBeNull();
        expect(idiomaDoCabecalho("*")).toBeNull();
        expect(idiomaDoCabecalho("fr, de;q=0.8")).toBeNull();
        expect(idiomaDoCabecalho(["en"])).toBeNull();
    });
});

describe("ehIdioma", () => {
    it("aceita só os idiomas suportados", () => {
        expect(IDIOMAS).toEqual(["pt", "en", "es"]);
        expect(ehIdioma("en")).toBe(true);
        expect(ehIdioma("fr")).toBe(false);
        expect(ehIdioma("pt-BR")).toBe(false);
        expect(ehIdioma(undefined)).toBe(false);
    });
});

describe("contexto de idioma", () => {
    it("fora de uma requisição vale o português", () => {
        expect(idiomaAtual()).toBe("pt");
        expect(idiomaFoiPedido()).toBe(false);
    });

    it("dentro do contexto vale o idioma da requisição, inclusive depois de um await", async () => {
        await executarComIdioma(
            "es",
            async () => {
                await Promise.resolve();
                expect(idiomaAtual()).toBe("es");
                expect(idiomaFoiPedido()).toBe(true);
            },
            { explicito: true }
        );
    });

    it("contextos simultâneos não se misturam", async () => {
        const ler = (idioma) =>
            executarComIdioma(idioma, async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return idiomaAtual();
            });

        expect(await Promise.all([ler("en"), ler("es"), ler("pt")])).toEqual(["en", "es", "pt"]);
    });

    it("idioma inválido vira português", () => {
        executarComIdioma("xx", () => expect(idiomaAtual()).toBe("pt"));
    });
});

describe("adotarIdiomaDaConta", () => {
    it("sem Accept-Language, adota o idioma da conta (na requisição e no contexto)", () => {
        const req = { idioma: "pt" };

        executarComIdioma("pt", () => {
            adotarIdiomaDaConta(req, { idioma: "es" });

            expect(req.idioma).toBe("es");
            expect(idiomaAtual()).toBe("es");
        });
    });

    it("com Accept-Language, a escolha da requisição vence a da conta", () => {
        const req = { idioma: "en" };

        executarComIdioma(
            "en",
            () => {
                adotarIdiomaDaConta(req, { idioma: "es" });

                expect(req.idioma).toBe("en");
                expect(idiomaAtual()).toBe("en");
            },
            { explicito: true }
        );
    });

    it("conta com idioma desconhecido ou fora de contexto não muda nada", () => {
        const req = { idioma: "pt" };

        executarComIdioma("pt", () => {
            adotarIdiomaDaConta(req, { idioma: "fr" });
            adotarIdiomaDaConta(req, null);
            expect(req.idioma).toBe("pt");
        });

        expect(() => adotarIdiomaDaConta(req, { idioma: "en" })).not.toThrow();
        expect(req.idioma).toBe("pt");
    });
});

describe("idiomaDoDestinatario", () => {
    it("usa o idioma salvo na conta de quem recebe", () => {
        executarComIdioma("pt", () => {
            expect(idiomaDoDestinatario({ idioma: "en" })).toBe("en");
        });
    });

    it("nunca usa o idioma de quem agiu quando o destinatário é outra pessoa", () => {
        executarComIdioma(
            "es",
            () => {
                // Administrador (es) bloqueando uma conta que usa inglês.
                expect(idiomaDoDestinatario({ idioma: "en" })).toBe("en");
            },
            { explicito: true }
        );
    });

    it("quando é o próprio destinatário na requisição, vale o idioma que ele escolheu agora", () => {
        executarComIdioma(
            "es",
            () => {
                expect(idiomaDoDestinatario({ idioma: "pt" }, { daRequisicao: true })).toBe("es");
            },
            { explicito: true }
        );
    });

    it("sem idioma pedido na requisição, cai no da conta, e sem conta no português", () => {
        executarComIdioma("pt", () => {
            expect(idiomaDoDestinatario({ idioma: "en" }, { daRequisicao: true })).toBe("en");
        });

        expect(idiomaDoDestinatario(undefined)).toBe("pt");
        expect(idiomaDoDestinatario({ idioma: "fr" })).toBe("pt");
    });
});
