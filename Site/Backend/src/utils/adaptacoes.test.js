import { describe, it, expect } from "vitest";

import {
    ADAPTACOES,
    CANAIS_A_EVITAR,
    CANAIS_DE_COMUNICACAO,
    canaisEmConflito,
    chavesDesconhecidas,
    contarItens,
    escolhaVazia,
    montarCopiaDaCandidatura,
    normalizarEscolha,
    normalizarPerfilDeAdaptacao,
    normalizarPreferenciasDeComunicacao,
    textoOuNulo
} from "./adaptacoes.js";

const PERFIL = { adaptacoes: ["legendas", "tempo_adicional", "instrucoes_escritas"], observacao: "Prefiro instruções curtas" };
const COMUNICACAO = { canaisPreferidos: ["chat", "email"], canaisAEvitar: ["ligacao"], melhorHorario: "Depois das 14h", observacao: "Respondo à tarde" };
const DEFICIENCIAS = [{ id: "d1", nome: "Deficiência auditiva", descricao: "x", CandidatoDeficiencia: { observacoes: "texto de saúde" } }];

describe("catálogo", () => {
    it("tem chaves únicas e todas com rótulo", () => {
        for (const lista of [ADAPTACOES, CANAIS_DE_COMUNICACAO, CANAIS_A_EVITAR]) {
            const chaves = lista.map((i) => i.chave);
            expect(new Set(chaves).size).toBe(chaves.length);
            expect(lista.every((i) => i.rotulo.length > 0)).toBe(true);
        }
    });

    it("não tem item que peça diagnóstico", () => {
        const texto = ADAPTACOES.map((a) => a.rotulo.toLowerCase()).join(" ");
        expect(texto).not.toMatch(/diagn[óo]stico|cid|laudo|doen[çc]a/);
    });
});

describe("normalização do que a pessoa envia", () => {
    it("descarta chaves fora do catálogo, repetidas, e mantém a ordem do catálogo", () => {
        const r = normalizarPerfilDeAdaptacao({ adaptacoes: ["tempo_adicional", "inventada", "legendas", "legendas", 5], observacao: "  oi   mundo " });

        expect(r.adaptacoes).toEqual(["legendas", "tempo_adicional"]);
        expect(r.observacao).toBe("oi mundo");
    });

    it("detecta chaves desconhecidas para a rota recusar o pedido", () => {
        expect(chavesDesconhecidas(["legendas", "x"], ADAPTACOES)).toEqual(["x"]);
        expect(chavesDesconhecidas(["legendas"], ADAPTACOES)).toEqual([]);
        expect(chavesDesconhecidas("legendas", ADAPTACOES)).toEqual([]);
    });

    it("corta textos longos e trata vazio como ausente", () => {
        expect(textoOuNulo("   ", 10)).toBeNull();
        expect(textoOuNulo("a".repeat(50), 10)).toHaveLength(10);
        expect(textoOuNulo(42, 10)).toBeNull();
    });

    it("preferências de comunicação separam o que se prefere do que se evita", () => {
        const r = normalizarPreferenciasDeComunicacao({ canaisPreferidos: ["chat", "ligacao"], canaisAEvitar: ["ligacao", "chat"] });

        expect(r.canaisPreferidos).toEqual(["chat"]);
        expect(r.canaisAEvitar).toEqual(["ligacao", "chat"]);
        expect(canaisEmConflito(r.canaisPreferidos, r.canaisAEvitar)).toEqual(["chat"]);
    });
});

describe("normalizarEscolha: nada vem ligado por padrão", () => {
    it("sem corpo, nada é compartilhado", () => {
        const e = escolhaVazia();

        expect(e.adaptacoes).toEqual([]);
        expect(e.comunicacao).toEqual({ canaisPreferidos: false, canaisAEvitar: false, melhorHorario: false });
        expect(e.deficiencia).toBe(false);
        expect(e.observacaoDeAdaptacao).toBe(false);
        expect(e.observacaoDeComunicacao).toBe(false);
        expect(e.outra).toBeNull();
    });

    it("só liga o que vem exatamente como true (texto 'true' ou 1 não valem)", () => {
        const e = normalizarEscolha({ deficiencia: "true", observacaoDeAdaptacao: 1, comunicacao: { canaisAEvitar: "true", melhorHorario: true } });

        expect(e.deficiencia).toBe(false);
        expect(e.observacaoDeAdaptacao).toBe(false);
        expect(e.comunicacao).toEqual({ canaisPreferidos: false, canaisAEvitar: false, melhorHorario: true });
    });
});

describe("montarCopiaDaCandidatura: o que a empresa recebe", () => {
    it("com a escolha vazia a cópia é vazia", () => {
        const { itens, total } = montarCopiaDaCandidatura({ perfil: PERFIL, comunicacao: COMUNICACAO, deficiencias: DEFICIENCIAS }, escolhaVazia());

        expect(itens).toEqual({});
        expect(total).toBe(0);
    });

    it("leva só as duas adaptações escolhidas (exemplo do pedido: legendas e tempo adicional)", () => {
        const { itens, total } = montarCopiaDaCandidatura(
            { perfil: PERFIL, comunicacao: COMUNICACAO, deficiencias: DEFICIENCIAS },
            normalizarEscolha({ adaptacoes: ["legendas", "tempo_adicional"] })
        );

        expect(itens.adaptacoes.map((a) => a.chave)).toEqual(["legendas", "tempo_adicional"]);
        expect(itens.adaptacoes[0].rotulo).toBe("Legendas em vídeos e chamadas");
        expect(Object.keys(itens)).toEqual(["adaptacoes"]);
        expect(total).toBe(2);
    });

    it("não vaza instruções por escrito, observações, comunicação nem deficiência que não foram escolhidas", () => {
        const { itens } = montarCopiaDaCandidatura(
            { perfil: PERFIL, comunicacao: COMUNICACAO, deficiencias: DEFICIENCIAS },
            normalizarEscolha({ adaptacoes: ["legendas"] })
        );

        const texto = JSON.stringify(itens);
        expect(texto).not.toContain("instrucoes_escritas");
        expect(texto).not.toContain("Prefiro instruções curtas");
        expect(texto).not.toContain("Depois das 14h");
        expect(texto).not.toContain("Deficiência auditiva");
    });

    it("a categoria de deficiência entra só com a escolha, e NUNCA com o texto livre do vínculo", () => {
        const { itens } = montarCopiaDaCandidatura(
            { perfil: PERFIL, comunicacao: COMUNICACAO, deficiencias: DEFICIENCIAS },
            normalizarEscolha({ deficiencia: true })
        );

        expect(itens.deficiencias).toEqual([{ id: "d1", nome: "Deficiência auditiva" }]);
        expect(JSON.stringify(itens)).not.toContain("texto de saúde");
    });

    it("aceita pedir uma adaptação que não está no perfil (o pedido é feito na candidatura)", () => {
        const { itens } = montarCopiaDaCandidatura(
            { perfil: { adaptacoes: [], observacao: null }, comunicacao: null, deficiencias: [] },
            normalizarEscolha({ adaptacoes: ["interprete_libras"], outra: "Preciso do local com rampa" })
        );

        expect(itens.adaptacoes.map((a) => a.chave)).toEqual(["interprete_libras"]);
        expect(itens.outra).toBe("Preciso do local com rampa");
    });

    it("comunicação: cada parte só entra se escolhida e se existir no perfil", () => {
        const { itens, total } = montarCopiaDaCandidatura(
            { perfil: PERFIL, comunicacao: COMUNICACAO, deficiencias: [] },
            normalizarEscolha({ comunicacao: { canaisPreferidos: true, melhorHorario: true } })
        );

        expect(itens.comunicacao.canaisPreferidos.map((c) => c.chave)).toEqual(["chat", "email"]);
        expect(itens.comunicacao.melhorHorario).toBe("Depois das 14h");
        expect(itens.comunicacao.canaisAEvitar).toBeUndefined();
        expect(total).toBe(2);
    });

    it("escolher uma parte que o perfil não tem não cria item vazio", () => {
        const { itens, total } = montarCopiaDaCandidatura(
            { perfil: { adaptacoes: [], observacao: null }, comunicacao: null, deficiencias: [] },
            normalizarEscolha({ comunicacao: { canaisPreferidos: true }, deficiencia: true, observacaoDeAdaptacao: true })
        );

        expect(itens).toEqual({});
        expect(total).toBe(0);
    });

    it("contarItens conta cada informação uma vez", () => {
        expect(contarItens(null)).toBe(0);
        expect(contarItens({ adaptacoes: [{}, {}], deficiencias: [{}], outra: "x", observacoes: { adaptacao: "a" } })).toBe(5);
    });
});
