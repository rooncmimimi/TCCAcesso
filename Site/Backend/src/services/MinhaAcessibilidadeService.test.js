import { beforeEach, describe, expect, it, vi } from "vitest";

/** Minha Acessibilidade: privada, da própria pessoa, sem diagnóstico e com a categoria de deficiência independente. */

const m = vi.hoisted(() => ({
    candidatoFindOne: vi.fn(),
    candidatoFindByPk: vi.fn(),
    perfilFindOne: vi.fn(),
    perfilCreate: vi.fn(),
    comFindOne: vi.fn(),
    comCreate: vi.fn()
}));

vi.mock("../models/index.js", () => ({
    Candidato: { findOne: m.candidatoFindOne, findByPk: m.candidatoFindByPk },
    PerfilAdaptacao: { findOne: m.perfilFindOne, create: m.perfilCreate },
    PreferenciaComunicacao: { findOne: m.comFindOne, create: m.comCreate }
}));

const { default: Servico } = await import("./MinhaAcessibilidadeService.js");

const ANA = { id: "u-ana", tipoUsuario: "candidato" };

function candidato(extra = {}) {
    return {
        id: "cand-1",
        usuarioId: "u-ana",
        exibirDeficienciaNoPerfil: false,
        update: vi.fn().mockImplementation(async function (v) {
            Object.assign(this, v);
            return this;
        }),
        getDeficiencias: vi.fn().mockResolvedValue([{ id: "d1", nome: "Deficiência visual", descricao: "...", CandidatoDeficiencia: { observacoes: "texto de saúde" } }]),
        ...extra
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    m.candidatoFindOne.mockResolvedValue(candidato());
    m.perfilFindOne.mockResolvedValue(null);
    m.comFindOne.mockResolvedValue(null);
});

describe("catálogo", () => {
    it("traz grupos, adaptações, canais, respostas da empresa e a versão do termo", () => {
        const c = Servico.catalogo();

        expect(c.grupos.map((g) => g.chave)).toEqual(["comunicacao", "ambiente", "aprendizagem", "tecnologia", "processo_seletivo"]);
        expect(c.adaptacoes.length).toBeGreaterThan(10);
        expect(c.respostasDaEmpresa.map((r) => r.chave)).toContain("precisamos_verificar");
        expect(c.termoVersao).toMatch(/^adaptacoes-/);
    });
});

describe("obter", () => {
    it("é sempre do candidato da sessão e nunca devolve o texto livre do vínculo da deficiência", async () => {
        const r = await Servico.obter(ANA);

        expect(m.candidatoFindOne.mock.calls[0][0].where).toEqual({ usuarioId: "u-ana" });
        expect(r.deficiencias).toEqual([{ id: "d1", nome: "Deficiência visual" }]);
        expect(JSON.stringify(r)).not.toContain("texto de saúde");
        expect(r.privacidade.exibirDeficienciaNoPerfil).toBe(false);
    });

    it("sem perfil criado, devolve listas vazias (não inventa necessidades)", async () => {
        const r = await Servico.obter(ANA);

        expect(r.adaptacoes).toEqual([]);
        expect(r.comunicacao.canaisPreferidos).toEqual([]);
        expect(r.observacao).toBeNull();
    });

    it("quem não é candidato não tem a página", async () => {
        m.candidatoFindOne.mockResolvedValue(null);

        await expect(Servico.obter({ id: "u-empresa" })).rejects.toThrow(/apenas candidatos/i);
    });
});

describe("atualizarAdaptacoes", () => {
    it("cria o perfil na primeira vez, só com chaves do catálogo", async () => {
        await Servico.atualizarAdaptacoes(ANA, { adaptacoes: ["legendas", "pausas"], observacao: "  Prefiro  frases curtas " });

        expect(m.perfilCreate).toHaveBeenCalledWith({ candidatoId: "cand-1", adaptacoes: ["legendas", "pausas"], observacao: "Prefiro frases curtas" });
    });

    it("na segunda vez atualiza o mesmo perfil (um por candidato)", async () => {
        const existente = { update: vi.fn() };
        m.perfilFindOne.mockResolvedValue(existente);

        await Servico.atualizarAdaptacoes(ANA, { adaptacoes: ["legendas"] });

        expect(existente.update).toHaveBeenCalled();
        expect(m.perfilCreate).not.toHaveBeenCalled();
    });

    it("recusa chave que não existe na lista (em vez de ignorar em silêncio)", async () => {
        await expect(Servico.atualizarAdaptacoes(ANA, { adaptacoes: ["diagnostico_x"] })).rejects.toThrow(/não existem na lista/i);
        expect(m.perfilCreate).not.toHaveBeenCalled();
    });
});

describe("atualizarComunicacao", () => {
    it("grava canais e horário", async () => {
        await Servico.atualizarComunicacao(ANA, { canaisPreferidos: ["chat"], canaisAEvitar: ["ligacao"], melhorHorario: "Depois das 14h" });

        expect(m.comCreate.mock.calls[0][0]).toMatchObject({ candidatoId: "cand-1", canaisPreferidos: ["chat"], canaisAEvitar: ["ligacao"], melhorHorario: "Depois das 14h" });
    });

    it("um canal não pode ser preferido e evitado ao mesmo tempo", async () => {
        await expect(Servico.atualizarComunicacao(ANA, { canaisPreferidos: ["chat"], canaisAEvitar: ["chat"] })).rejects.toThrow(/preferido e evitado/i);
    });

    it("recusa canal inexistente", async () => {
        await expect(Servico.atualizarComunicacao(ANA, { canaisPreferidos: ["pombo_correio"] })).rejects.toThrow(/não existem na lista/i);
    });
});

describe("atualizarPrivacidade: exibir a categoria no perfil", () => {
    it("liga e desliga a exibição, e só isso", async () => {
        const dono = candidato();
        m.candidatoFindOne.mockResolvedValue(dono);

        await Servico.atualizarPrivacidade(ANA, { exibirDeficienciaNoPerfil: true });

        expect(dono.update).toHaveBeenCalledWith({ exibirDeficienciaNoPerfil: true });
        expect(m.perfilCreate).not.toHaveBeenCalled();
        expect(m.comCreate).not.toHaveBeenCalled();
    });

    it("exige um verdadeiro/falso de verdade (texto não vale)", async () => {
        await expect(Servico.atualizarPrivacidade(ANA, { exibirDeficienciaNoPerfil: "true" })).rejects.toThrow(/verdadeiro ou falso/i);
    });
});
