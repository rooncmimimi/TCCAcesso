import { describe, expect, it } from "vitest";

import {
    AMBIENTE_SENSORIAL,
    CHAVES_DE_ENTREVISTA,
    ITENS_FISICOS,
    OPCOES_DE_ENTREVISTA,
    aplicarVerificacao,
    catalogoDoAmbiente,
    normalizarAcessibilidadeFisica,
    normalizarAmbienteSensorial,
    normalizarEntrevista
} from "./ambienteDeTrabalho.js";
import { ADAPTACOES } from "./adaptacoes.js";

describe("catálogo", () => {
    it("tem chaves únicas e as opções de cada característica também", () => {
        const chaves = [...AMBIENTE_SENSORIAL.map((c) => c.chave), ...ITENS_FISICOS.map((i) => i.chave)];
        expect(new Set(chaves).size).toBe(chaves.length);

        for (const c of AMBIENTE_SENSORIAL) {
            expect(new Set(c.opcoes.map((o) => o.valor)).size).toBe(c.opcoes.length);
        }
    });

    it("as adaptações da entrevista existem todas no catálogo do Bloco 2 (uma fonte só)", () => {
        const todas = new Set(ADAPTACOES.map((a) => a.chave));

        expect(CHAVES_DE_ENTREVISTA.every((c) => todas.has(c))).toBe(true);
        expect(OPCOES_DE_ENTREVISTA).toHaveLength(CHAVES_DE_ENTREVISTA.length);
    });

    it("o catálogo público traz tudo o que o formulário e a tela precisam", () => {
        expect(Object.keys(catalogoDoAmbiente()).sort()).toEqual(["ambienteSensorial", "entrevista", "itensFisicos", "origensFisicas", "situacoesFisicas"]);
    });

    it("o mapa físico cobre os itens pedidos, incluindo o local da entrevista", () => {
        expect(ITENS_FISICOS.map((i) => i.chave)).toEqual(
            expect.arrayContaining(["rampa", "elevador", "banheiro_acessivel", "entrada_sem_degraus", "estacionamento", "piso_tatil", "sinalizacao", "circulacao", "local_entrevista"])
        );
    });
});

describe("normalizarAmbienteSensorial", () => {
  it("vazio ou ausente: nada informado, nada inventado", () => {
        expect(normalizarAmbienteSensorial(undefined)).toEqual({ valor: {}, erros: [] });
        expect(normalizarAmbienteSensorial({})).toEqual({ valor: {}, erros: [] });
        expect(normalizarAmbienteSensorial({ ruido: "", iluminacao: null })).toEqual({ valor: {}, erros: [] });
    });

    it("guarda só o que foi informado, com a rotina aparada", () => {
        const { valor, erros } = normalizarAmbienteSensorial({ ruido: "silencioso", espaco: "individual", rotina: "  Das 9h  às 17h  " });

        expect(erros).toEqual([]);
        expect(valor).toEqual({ ruido: "silencioso", espaco: "individual", rotina: "Das 9h às 17h" });
    });

    it("valor fora da lista e característica desconhecida são ERRO, não são ignorados em silêncio", () => {
        const { erros } = normalizarAmbienteSensorial({ ruido: "ensurdecedor", cheiro: "forte" });

        expect(erros).toHaveLength(2);
        expect(erros.join(" ")).toMatch(/Nível de ruído/);
        expect(erros.join(" ")).toMatch(/cheiro/);
    });

    it("não aceita algo que não seja objeto", () => {
        expect(normalizarAmbienteSensorial("silencioso").erros).toHaveLength(1);
        expect(normalizarAmbienteSensorial(["x"]).erros).toHaveLength(1);
    });

    it("corta a rotina em 500 caracteres", () => {
        expect(normalizarAmbienteSensorial({ rotina: "a".repeat(900) }).valor.rotina).toHaveLength(500);
    });
});

describe("normalizarAcessibilidadeFisica: a empresa só declara", () => {
    it("um item novo nasce 'declarado', mesmo que o cliente mande 'verificado'", () => {
        const { valor } = normalizarAcessibilidadeFisica({ rampa: { situacao: "sim", origem: "verificado", detalhe: "Na entrada principal" } });

        expect(valor.rampa).toEqual({ situacao: "sim", origem: "declarado", detalhe: "Na entrada principal" });
    });

    it("item que já estava verificado e NÃO mudou continua verificado", () => {
        const atual = { rampa: { situacao: "sim", origem: "verificado", detalhe: "Entrada", verificadoEm: "2026-11-01T10:00:00.000Z" } };

        const { valor, mudou } = normalizarAcessibilidadeFisica({ rampa: { situacao: "sim", detalhe: "Entrada" } }, atual);

        expect(valor.rampa.origem).toBe("verificado");
        expect(valor.rampa.verificadoEm).toBe("2026-11-01T10:00:00.000Z");
        expect(mudou).toBe(false);
    });

    it("alterar o que foi verificado derruba a verificação (a moderação conferiu outra coisa)", () => {
        const atual = { rampa: { situacao: "sim", origem: "verificado", verificadoEm: "2026-11-01T10:00:00.000Z" } };

        expect(normalizarAcessibilidadeFisica({ rampa: { situacao: "parcial" } }, atual).valor.rampa).toEqual({ situacao: "parcial", origem: "declarado" });
        expect(normalizarAcessibilidadeFisica({ rampa: { situacao: "sim", detalhe: "Agora com corrimão" } }, atual).valor.rampa.origem).toBe("declarado");
    });

    it("item que a empresa tira do mapa vira 'não informado' (some)", () => {
        const atual = { rampa: { situacao: "sim", origem: "declarado" }, elevador: { situacao: "nao", origem: "declarado" } };

        const { valor } = normalizarAcessibilidadeFisica({ rampa: { situacao: "sim" } }, atual);

        expect(Object.keys(valor)).toEqual(["rampa"]);
    });

    it("sem corpo, mantém o mapa atual", () => {
        const atual = { rampa: { situacao: "sim", origem: "verificado" } };

        expect(normalizarAcessibilidadeFisica(undefined, atual).valor).toEqual(atual);
    });

    it("situação inválida, item desconhecido e formato errado são erros", () => {
        expect(normalizarAcessibilidadeFisica({ rampa: { situacao: "talvez" } }).erros).toHaveLength(1);
        expect(normalizarAcessibilidadeFisica({ helipoleto: { situacao: "sim" } }).erros).toHaveLength(1);
        expect(normalizarAcessibilidadeFisica({ rampa: "sim" }).erros).toHaveLength(1);
        expect(normalizarAcessibilidadeFisica([1]).erros).toHaveLength(1);
    });
});

describe("aplicarVerificacao (só a moderação chama)", () => {
    const agora = new Date("2026-11-04T12:00:00.000Z");
    const atual = { rampa: { situacao: "sim", origem: "declarado", detalhe: "Entrada" }, elevador: { situacao: "nao", origem: "declarado" } };

    it("verifica só os itens que existem e informa quais mudaram", () => {
        const { valor, alteradas } = aplicarVerificacao(atual, ["rampa", "piso_tatil"], true, agora);

        expect(alteradas).toEqual(["rampa"]);
        expect(valor.rampa).toEqual({ situacao: "sim", origem: "verificado", detalhe: "Entrada", verificadoEm: "2026-11-04T12:00:00.000Z" });
        expect(valor.elevador.origem).toBe("declarado");
        expect(atual.rampa.origem).toBe("declarado");
    });

    it("desmarcar volta para declarado e tira a data", () => {
        const verificado = aplicarVerificacao(atual, ["rampa"], true, agora).valor;
        const { valor, alteradas } = aplicarVerificacao(verificado, ["rampa"], false, agora);

        expect(alteradas).toEqual(["rampa"]);
        expect(valor.rampa).toEqual({ situacao: "sim", origem: "declarado", detalhe: "Entrada" });
    });

    it("repetir a mesma verificação não conta como mudança", () => {
        const verificado = aplicarVerificacao(atual, ["rampa"], true, agora).valor;

        expect(aplicarVerificacao(verificado, ["rampa"], true, agora).alteradas).toEqual([]);
    });
});

describe("normalizarEntrevista", () => {
    it("fica com as chaves permitidas, sem repetir e na ordem do catálogo", () => {
        expect(normalizarEntrevista(["tempo_adicional", "interprete_libras", "tempo_adicional"]).valor).toEqual(["interprete_libras", "tempo_adicional"]);
    });

    it("chave fora do recorte (por exemplo, de tecnologia) é erro", () => {
        expect(normalizarEntrevista(["leitor_de_tela"]).erros).toHaveLength(1);
        expect(normalizarEntrevista(["x", 5]).erros).toHaveLength(2);
        expect(normalizarEntrevista("legendas").erros).toHaveLength(1);
    });

    it("ausente: nada oferecido, nada inventado", () => {
        expect(normalizarEntrevista(undefined)).toEqual({ valor: [], erros: [] });
    });
});
