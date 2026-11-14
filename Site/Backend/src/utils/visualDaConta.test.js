import { describe, it, expect } from "vitest";

import { limparVisual } from "./visualDaConta.js";

/**
 * O JSON da personalização visual vem do cliente. Este arquivo é a última porta antes do banco, e
 * o que ele deixa passar vira variável de CSS na tela de alguém — então o teste aqui é de recusa,
 * não de aceitação.
 */

const COMPLETO = {
    padrao: "protanopia",
    intensidade: 80,
    saturacao: 90,
    brilho: 110,
    contraste: 7,
    cores: { sucesso: "#0072b2" }
};

describe("limparVisual: o que passa", () => {
    it("deixa passar a personalização inteira, como veio", () => {
        expect(limparVisual(COMPLETO)).toEqual(COMPLETO);
    });

    it("guarda a cor sempre em minúscula, para não gravar a mesma cor de duas formas", () => {
        expect(limparVisual({ ...COMPLETO, cores: { erro: "#A4036F" } }).cores).toEqual({ erro: "#a4036f" });
    });
});

describe("limparVisual: o que NÃO passa", () => {
    it("padrão inventado vira 'nenhum'", () => {
        expect(limparVisual({ ...COMPLETO, padrao: "url(javascript:alert(1))" }).padrao).toBe("nenhum");
    });

    it("número fora da faixa é preso no limite", () => {
        const limpo = limparVisual({ ...COMPLETO, intensidade: 9999, saturacao: -50, brilho: 0 });

        expect(limpo.intensidade).toBe(100);
        expect(limpo.saturacao).toBe(0);
        expect(limpo.brilho).toBe(70);
    });

    it("número que não é número volta ao padrão", () => {
        expect(limparVisual({ ...COMPLETO, intensidade: "muito" }).intensidade).toBe(100);
        expect(limparVisual({ ...COMPLETO, brilho: null }).brilho).toBe(100);
    });

    it("contraste fora da lista volta para 4,5", () => {
        expect(limparVisual({ ...COMPLETO, contraste: 1.2 }).contraste).toBe(4.5);
        expect(limparVisual({ ...COMPLETO, contraste: 10 }).contraste).toBe(10);
    });

    it("cor que não é #rrggbb é descartada — inclusive a que seria CSS", () => {
        const limpo = limparVisual({
            ...COMPLETO,
            cores: {
                sucesso: "red",
                erro: "#fff",
                alerta: "var(--x); background: url(http://exemplo)",
                info: "#6a3d9a"
            }
        });

        expect(limpo.cores).toEqual({ info: "#6a3d9a" });
    });

    it("papel de cor desconhecido é descartado", () => {
        expect(limparVisual({ ...COMPLETO, cores: { inventado: "#000000" } }).cores).toEqual({});
    });

    it("cores que nem objeto é vira objeto vazio", () => {
        expect(limparVisual({ ...COMPLETO, cores: "#000000" }).cores).toEqual({});
        expect(limparVisual({ ...COMPLETO, cores: ["#000000"] }).cores).toEqual({});
    });

    it("chave que não existe some, em vez de ir parar no banco", () => {
        expect(limparVisual({ ...COMPLETO, apagarTudo: true })).not.toHaveProperty("apagarTudo");
    });
});

describe("limparVisual: o estado 'nunca personalizou'", () => {
    it.each([[null], [undefined], ["texto"], [42], [[]]])("%s vira null", (valor) => {
        expect(limparVisual(valor)).toBeNull();
    });

    it("a personalização padrão inteira também vira null: não há o que guardar", () => {
        expect(
            limparVisual({ padrao: "nenhum", intensidade: 100, saturacao: 100, brilho: 100, contraste: 4.5, cores: {} })
        ).toBeNull();
    });

    it("mas um objeto vazio NÃO é padrão por acaso: vira o padrão e, sendo padrão, vira null", () => {
        expect(limparVisual({})).toBeNull();
    });

    it("basta uma cor escolhida para deixar de ser 'nunca personalizou'", () => {
        expect(limparVisual({ cores: { erro: "#a4036f" } })).not.toBeNull();
    });
});
