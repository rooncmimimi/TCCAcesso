import { beforeEach, describe, expect, it, vi } from "vitest";
import { UniqueConstraintError } from "sequelize";

/**
 * O rascunho da candidatura: só da pessoa dona, no servidor, sem duplicar, com prazo, e fora de
 * qualquer consulta de empresa. Banco mockado.
 */

const m = vi.hoisted(() => ({
    candidatoFindOne: vi.fn(),
    vagaFindByPk: vi.fn(),
    candidaturaFindOne: vi.fn(),
    rascunhoFindOne: vi.fn(),
    rascunhoFindAll: vi.fn(),
    rascunhoCreate: vi.fn(),
    rascunhoDestroy: vi.fn()
}));

vi.mock("../models/index.js", () => ({
    Candidato: { findOne: m.candidatoFindOne },
    Candidatura: { findOne: m.candidaturaFindOne },
    CandidaturaRascunho: {
        findOne: m.rascunhoFindOne,
        findAll: m.rascunhoFindAll,
        create: m.rascunhoCreate,
        destroy: m.rascunhoDestroy
    },
    Empresa: {},
    Vaga: { findByPk: m.vagaFindByPk }
}));

const { default: Servico, DIAS_DE_VALIDADE_DO_RASCUNHO } = await import("./CandidaturaRascunhoService.js");

const ANA = { id: "u-ana", tipoUsuario: "candidato" };
const DIA = 24 * 60 * 60 * 1000;

beforeEach(() => {
    vi.clearAllMocks();
    m.candidatoFindOne.mockResolvedValue({ id: "cand-1", usuarioId: "u-ana" });
    m.vagaFindByPk.mockResolvedValue({ id: "v1", status: "aberta" });
    m.candidaturaFindOne.mockResolvedValue(null);
    m.rascunhoFindOne.mockResolvedValue(null);
    m.rascunhoCreate.mockImplementation(async (v) => ({ id: "r1", ...v, atualizadoEm: new Date() }));
});

describe("salvar", () => {
    it("cria o rascunho no servidor com prazo de 30 dias, só com a mensagem e as ESCOLHAS", async () => {
        const antes = Date.now();

        const r = await Servico.salvar("v1", { mensagem: "  Olá, tenho interesse  ", etapa: "adaptacoes", selecao: { adaptacoes: ["legendas"], deficiencia: true } }, ANA);

        const gravado = m.rascunhoCreate.mock.calls[0][0];
        expect(gravado.candidatoId).toBe("cand-1");
        expect(gravado.vagaId).toBe("v1");
        expect(gravado.mensagem).toBe("Olá, tenho interesse");
        expect(gravado.etapa).toBe("adaptacoes");
        expect(gravado.selecao.adaptacoes).toEqual(["legendas"]);
        expect(gravado.selecao.deficiencia).toBe(true);
        expect(gravado.expiraEm.getTime() - antes).toBeGreaterThanOrEqual(DIAS_DE_VALIDADE_DO_RASCUNHO * DIA - 5000);
        expect(r.etapa).toBe("adaptacoes");
    });

    it("não guarda conteúdo do perfil: campos extras na seleção são descartados", async () => {
        await Servico.salvar("v1", { selecao: { adaptacoes: ["legendas"], itens: { x: 1 }, cpf: "123", observacaoDoPerfil: "segredo" } }, ANA);

        const texto = JSON.stringify(m.rascunhoCreate.mock.calls[0][0].selecao);
        expect(texto).not.toContain("segredo");
        expect(texto).not.toContain("cpf");
        expect(texto).not.toContain("itens");
    });

    it("salvar de novo ATUALIZA o mesmo rascunho (sem duplicar) e renova o prazo", async () => {
        const existente = { id: "r1", vagaId: "v1", update: vi.fn().mockImplementation(async function (v) { Object.assign(this, v); return this; }) };
        m.rascunhoFindOne.mockResolvedValue(existente);

        await Servico.salvar("v1", { mensagem: "segunda versão" }, ANA);

        expect(m.rascunhoCreate).not.toHaveBeenCalled();
        expect(existente.update.mock.calls[0][0].mensagem).toBe("segunda versão");
        expect(existente.update.mock.calls[0][0].expiraEm).toBeInstanceOf(Date);
    });

    it("duas abas salvando juntas: a restrição única não vira erro, vira atualização", async () => {
        const existente = { id: "r1", vagaId: "v1", update: vi.fn().mockResolvedValue({ id: "r1" }) };
        m.rascunhoFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existente);
        m.rascunhoCreate.mockRejectedValueOnce(new UniqueConstraintError({ errors: [] }));

        await expect(Servico.salvar("v1", { mensagem: "oi" }, ANA)).resolves.toBeTruthy();
        expect(existente.update).toHaveBeenCalled();
    });

    it("quem já se candidatou não tem rascunho (evita duplicidade com a candidatura)", async () => {
        m.candidaturaFindOne.mockResolvedValue({ id: "cd-1" });

        await expect(Servico.salvar("v1", { mensagem: "oi" }, ANA)).rejects.toThrow(/já se candidatou/i);
        expect(m.rascunhoCreate).not.toHaveBeenCalled();
    });

    it("vaga inexistente ou fechada não aceita rascunho", async () => {
        m.vagaFindByPk.mockResolvedValue(null);
        await expect(Servico.salvar("v1", {}, ANA)).rejects.toThrow(/não encontrada/i);

        m.vagaFindByPk.mockResolvedValue({ id: "v1", status: "encerrada" });
        await expect(Servico.salvar("v1", {}, ANA)).rejects.toThrow(/não está aberta/i);
    });

    it("recusa adaptação fora do catálogo e etapa inválida", async () => {
        await expect(Servico.salvar("v1", { selecao: { adaptacoes: ["x"] } }, ANA)).rejects.toThrow(/não existem na lista/i);
        await expect(Servico.salvar("v1", { etapa: "enviar" }, ANA)).rejects.toThrow(/etapa/i);
    });

    it("quem não é candidato não salva rascunho", async () => {
        m.candidatoFindOne.mockResolvedValue(null);

        await expect(Servico.salvar("v1", {}, { id: "u-empresa" })).rejects.toThrow(/apenas candidatos/i);
    });
});

describe("a pessoa só mexe no PRÓPRIO rascunho", () => {
    it("toda consulta é escopada ao candidato da sessão (nunca a um id da requisição)", async () => {
        await Servico.obter("v1", ANA);
        await Servico.descartar("v1", ANA);

        expect(m.rascunhoFindOne.mock.calls[0][0].where).toEqual({ vagaId: "v1", candidatoId: "cand-1" });
        expect(m.rascunhoDestroy.mock.calls[0][0].where).toEqual({ vagaId: "v1", candidatoId: "cand-1" });
    });

    it("a lista traz só os rascunhos da pessoa e que ainda valem", async () => {
        m.rascunhoFindAll.mockResolvedValue([]);

        await Servico.listar(ANA);

        const where = m.rascunhoFindAll.mock.calls[0][0].where;
        expect(where.candidatoId).toBe("cand-1");
        expect(Object.getOwnPropertySymbols(where.expiraEm)).toHaveLength(1);
    });
});

describe("retomar e expirar", () => {
    it("obter devolve o rascunho para continuar de onde parou", async () => {
        m.rascunhoFindOne.mockResolvedValue({
            id: "r1", vagaId: "v1", mensagem: "texto", selecao: { adaptacoes: ["legendas"] }, etapa: "revisao",
            expiraEm: new Date(Date.now() + DIA), atualizadoEm: new Date(), destroy: vi.fn()
        });

        const r = await Servico.obter("v1", ANA);

        expect(r.etapa).toBe("revisao");
        expect(r.mensagem).toBe("texto");
        expect(r.selecao.adaptacoes).toEqual(["legendas"]);
    });

    it("rascunho vencido é apagado ao ler e não volta", async () => {
        const destroy = vi.fn();
        m.rascunhoFindOne.mockResolvedValue({ id: "r1", expiraEm: new Date(Date.now() - 1000), destroy });

        expect(await Servico.obter("v1", ANA)).toBeNull();
        expect(destroy).toHaveBeenCalled();
    });

    it("sem rascunho, devolve nulo", async () => {
        expect(await Servico.obter("v1", ANA)).toBeNull();
    });

    it("limparExpirados apaga os vencidos", async () => {
        m.rascunhoDestroy.mockResolvedValue(3);

        expect(await Servico.limparExpirados(new Date("2026-11-04T00:00:00Z"))).toBe(3);
    });

    it("o envio definitivo apaga o rascunho dentro da transação da candidatura", async () => {
        const transaction = {};

        await Servico.apagarDoEnvio("v1", "cand-1", { transaction });

        expect(m.rascunhoDestroy.mock.calls[0][0]).toEqual({ where: { vagaId: "v1", candidatoId: "cand-1" }, transaction });
    });

    it("descartar informa se havia algo para descartar", async () => {
        m.rascunhoDestroy.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

        expect(await Servico.descartar("v1", ANA)).toEqual({ descartado: true });
        expect(await Servico.descartar("v1", ANA)).toEqual({ descartado: false });
    });
});
