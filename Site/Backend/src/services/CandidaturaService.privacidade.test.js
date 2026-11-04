import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que cada pessoa recebe das candidaturas: a empresa nunca recebe o candidato inteiro, só a
 * empresa dona da vaga lê, as adaptações vêm da cópia autorizada, e o envio é atômico. Banco mockado;
 * `candidatoPrivacidade.js` e `autorizacao.js` são os REAIS.
 */

const m = vi.hoisted(() => {
    const transacao = { commit: vi.fn(), rollback: vi.fn() };

    return {
        transacao,
        vagaFindByPk: vi.fn(),
        candidatoFindOne: vi.fn(),
        candidaturaFindOne: vi.fn(),
        candidaturaCreate: vi.fn(),
        candidaturaFindAndCountAll: vi.fn(),
        candidaturaFindByPk: vi.fn(),
        paraAEmpresa: vi.fn(),
        paraOCandidato: vi.fn(),
        registrar: vi.fn(),
        encerrarPorCancelamento: vi.fn(),
        apagarDoEnvio: vi.fn(),
        notificar: vi.fn()
    };
});

vi.mock("../config/bancoDeDados.js", () => ({
    default: { transaction: vi.fn().mockResolvedValue(m.transacao), define: vi.fn(() => ({})) }
}));
vi.mock("../models/index.js", () => ({
    Candidatura: { findOne: m.candidaturaFindOne, create: m.candidaturaCreate, findAndCountAll: m.candidaturaFindAndCountAll, findByPk: m.candidaturaFindByPk },
    Vaga: { findByPk: m.vagaFindByPk },
    Empresa: { findOne: vi.fn() },
    Candidato: { findOne: m.candidatoFindOne },
    Usuario: {}
}));
vi.mock("./NotificacaoService.js", () => ({
    default: { criar: m.notificar, emitirNotificacaoCriada: vi.fn(), contarNaoLidasDe: vi.fn().mockResolvedValue(1) }
}));
vi.mock("./BloqueioService.js", () => ({ default: { estaBloqueadoEntre: vi.fn().mockResolvedValue(false) } }));
vi.mock("./CandidaturaAdaptacaoService.js", () => ({
    default: {
        paraAEmpresa: m.paraAEmpresa,
        paraOCandidato: m.paraOCandidato,
        registrar: m.registrar,
        encerrarPorCancelamento: m.encerrarPorCancelamento
    }
}));
vi.mock("./CandidaturaRascunhoService.js", () => ({ default: { apagarDoEnvio: m.apagarDoEnvio } }));

const { default: Servico } = await import("./CandidaturaService.js");

const EMPRESA_A = { id: "u-emp-a", tipoUsuario: "empresa" };
const EMPRESA_B = { id: "u-emp-b", tipoUsuario: "empresa" };
const ADMIN = { id: "u-admin", tipoUsuario: "administrador" };
const ANA = { id: "u-ana", nome: "Ana", tipoUsuario: "candidato" };

/** Um candidato "como veio do banco": tudo o que o model tem, inclusive o que é privado. */
function candidatoCompleto() {
    return {
        id: "cand-1",
        usuarioId: "u-ana",
        cpf: "12345678901",
        endereco: "Rua A, 1",
        cep: "01001000",
        dataNascimento: "1990-01-01",
        genero: "F",
        pretensaoSalarial: "5000",
        necessidadesAcessibilidade: "Uso leitor de tela",
        curriculo: "privado/cv.pdf",
        curriculoNome: "cv.pdf",
        exibirDeficienciaNoPerfil: false,
        tituloProfissional: "Analista",
        cidade: "São Paulo",
        usuario: { id: "u-ana", nome: "Ana", email: "ana@exemplo.com", fotoPerfil: null }
    };
}

function linha(status, candidato = candidatoCompleto()) {
    return { id: `cd-${status}`, status, candidato, toJSON() { return { id: this.id, status: this.status, candidato: this.candidato }; } };
}

const vagaDaEmpresaA = { id: "v1", titulo: "Vaga", status: "aberta", empresa: { usuarioId: "u-emp-a", statusAprovacao: "aprovada" } };

beforeEach(() => {
    vi.clearAllMocks();
    m.paraAEmpresa.mockResolvedValue(new Map());
    m.paraOCandidato.mockResolvedValue(new Map());
    m.vagaFindByPk.mockResolvedValue(vagaDaEmpresaA);
});

describe("listarDaVaga: o que a empresa recebe", () => {
    it("nunca o candidato inteiro: sem CPF, endereço, nascimento, necessidades, currículo nem categoria de deficiência", async () => {
        m.candidaturaFindAndCountAll.mockResolvedValue({ rows: [linha("pendente")], count: 1 });

        const r = await Servico.listarDaVaga("v1", EMPRESA_A, {});

        const candidato = r.candidaturas[0].candidato;
        for (const campo of ["cpf", "endereco", "cep", "dataNascimento", "genero", "pretensaoSalarial", "necessidadesAcessibilidade", "curriculo", "deficiencias", "exibirDeficienciaNoPerfil"]) {
            expect(candidato[campo], campo).toBeUndefined();
        }
        expect(candidato.tituloProfissional).toBe("Analista");
        expect(candidato.cidade).toBe("São Paulo");
    });

    it("o e-mail de contato vem só enquanto a candidatura está ativa", async () => {
        m.candidaturaFindAndCountAll.mockResolvedValue({
            rows: [linha("pendente"), linha("em_analise"), linha("rejeitada"), linha("cancelada")],
            count: 4
        });

        const r = await Servico.listarDaVaga("v1", EMPRESA_A, {});
        const porStatus = Object.fromEntries(r.candidaturas.map((c) => [c.status, c.candidato.usuario.email]));

        const curriculoPorStatus = Object.fromEntries(r.candidaturas.map((c) => [c.status, c.candidato.curriculoNome]));
        expect(curriculoPorStatus.pendente).toBe("cv.pdf");
        expect(curriculoPorStatus.rejeitada).toBeUndefined();
        expect(porStatus.pendente).toBe("ana@exemplo.com");
        expect(porStatus.em_analise).toBe("ana@exemplo.com");
        expect(porStatus.rejeitada).toBeUndefined();
        expect(porStatus.cancelada).toBeUndefined();
    });

    it("as adaptações são só as autorizadas, vindas da cópia, e a empresa nunca lê o perfil", async () => {
        m.candidaturaFindAndCountAll.mockResolvedValue({ rows: [linha("pendente")], count: 1 });
        m.paraAEmpresa.mockResolvedValue(new Map([["cd-pendente", { versao: 1, itens: { adaptacoes: [{ chave: "legendas" }] } }]]));

        const r = await Servico.listarDaVaga("v1", EMPRESA_A, {});

        expect(r.candidaturas[0].adaptacoes.itens.adaptacoes).toEqual([{ chave: "legendas" }]);
        expect(JSON.stringify(r)).not.toContain("Uso leitor de tela");
    });

    it("sem cópia autorizada, adaptacoes é nulo", async () => {
        m.candidaturaFindAndCountAll.mockResolvedValue({ rows: [linha("pendente")], count: 1 });

        const r = await Servico.listarDaVaga("v1", EMPRESA_A, {});

        expect(r.candidaturas[0].adaptacoes).toBeNull();
    });

    it("OUTRA empresa não lista as candidaturas desta vaga", async () => {
        await expect(Servico.listarDaVaga("v1", EMPRESA_B, {})).rejects.toThrow(/não tem permissão/i);
        expect(m.candidaturaFindAndCountAll).not.toHaveBeenCalled();
    });

    it("o administrador vê o candidato como moderação, mas não lê adaptações", async () => {
        m.candidaturaFindAndCountAll.mockResolvedValue({ rows: [linha("pendente")], count: 1 });

        const r = await Servico.listarDaVaga("v1", ADMIN, {});

        expect(r.candidaturas[0].adaptacoes).toBeNull();
        expect(m.paraAEmpresa).not.toHaveBeenCalled();
    });
});

describe("buscarPorId", () => {
    const candidatura = (status = "pendente") => ({
        ...linha(status),
        vaga: { empresa: { usuarioId: "u-emp-a" } },
        candidato: candidatoCompleto(),
        toJSON() { return { id: this.id, status: this.status, candidato: this.candidato, vaga: this.vaga }; }
    });

    it("outra empresa não abre a candidatura", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura());

        await expect(Servico.buscarPorId("cd-pendente", EMPRESA_B)).rejects.toThrow(/acesso negado/i);
    });

    it("outro candidato não abre a candidatura de Ana", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura());

        await expect(Servico.buscarPorId("cd-pendente", { id: "u-outro", tipoUsuario: "candidato" })).rejects.toThrow(/acesso negado/i);
    });

    it("a empresa dona recebe o candidato sem dados privados e com as adaptações autorizadas", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura());
        m.paraAEmpresa.mockResolvedValue(new Map([["cd-pendente", { versao: 1, itens: { adaptacoes: [{ chave: "legendas" }] } }]]));

        const r = await Servico.buscarPorId("cd-pendente", EMPRESA_A);

        expect(r.candidato.cpf).toBeUndefined();
        expect(r.candidato.necessidadesAcessibilidade).toBeUndefined();
        expect(r.candidato.curriculo).toBeUndefined();
        expect(r.candidato.usuario.email).toBe("ana@exemplo.com");
        expect(r.adaptacoes.itens.adaptacoes).toHaveLength(1);
    });

    it("a própria pessoa vê tudo dela e a visão do que autorizou (inclusive se já retirou)", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura());
        m.paraOCandidato.mockResolvedValue(new Map([["cd-pendente", { estado: "retirada", itens: null }]]));

        const r = await Servico.buscarPorId("cd-pendente", ANA);

        expect(r.candidato.cpf).toBe("12345678901");
        expect(r.adaptacoes.estado).toBe("retirada");
        expect(m.paraAEmpresa).not.toHaveBeenCalled();
    });
});

describe("criar (envio definitivo)", () => {
    beforeEach(() => {
        m.candidatoFindOne.mockResolvedValue({ id: "cand-1", usuarioId: "u-ana" });
        m.vagaFindByPk.mockResolvedValue({ id: "v1", titulo: "Vaga", status: "aberta", empresa: { usuarioId: "u-emp-a", statusAprovacao: "aprovada" } });
        m.candidaturaFindOne.mockResolvedValue(null);
        m.candidaturaCreate.mockResolvedValue({ id: "cd-1" });
        m.notificar.mockResolvedValue({ id: "n1" });
    });

    it("cria a candidatura, grava a cópia autorizada e apaga o rascunho na MESMA transação", async () => {
        await Servico.criar("v1", "Olá", ANA, { compartilhar: { adaptacoes: ["legendas"] }, aceita: true });

        const registro = m.registrar.mock.calls[0];
        expect(registro[0]).toMatchObject({ candidaturaId: "cd-1", corpo: { adaptacoes: ["legendas"] }, aceita: true });
        expect(registro[1].transaction).toBe(m.transacao);
        expect(m.apagarDoEnvio).toHaveBeenCalledWith("v1", "cand-1", { transaction: m.transacao });
        expect(m.transacao.commit).toHaveBeenCalled();
    });

    it("sem escolha, o envio segue e nada é compartilhado (o service decide: sem escolha, sem cópia)", async () => {
        await Servico.criar("v1", "Olá", ANA);

        expect(m.registrar.mock.calls[0][0].corpo).toEqual({});
        expect(m.transacao.commit).toHaveBeenCalled();
    });

    it("se a autorização falha (escolha sem confirmação), NADA é enviado: rollback, sem notificação à empresa", async () => {
        m.registrar.mockRejectedValueOnce(new Error("confirme a autorização"));

        await expect(Servico.criar("v1", "Olá", ANA, { compartilhar: { adaptacoes: ["legendas"] } })).rejects.toThrow(/confirme/);

        expect(m.transacao.rollback).toHaveBeenCalled();
        expect(m.transacao.commit).not.toHaveBeenCalled();
        expect(m.notificar).not.toHaveBeenCalled();
    });

    it("a notificação à empresa não carrega nada de acessibilidade", async () => {
        await Servico.criar("v1", "Olá", ANA, { compartilhar: { adaptacoes: ["legendas"] }, aceita: true });

        expect(JSON.stringify(m.notificar.mock.calls[0][0])).not.toMatch(/legendas|adapta|acessib/i);
    });
});

describe("cancelar", () => {
    it("encerra a cópia autorizada na mesma transação em que cancela", async () => {
        const salvar = vi.fn();
        m.candidaturaFindByPk.mockResolvedValue({ id: "cd-1", candidato: { usuarioId: "u-ana" }, status: "pendente", save: salvar });

        await Servico.cancelar("cd-1", ANA);

        expect(salvar).toHaveBeenCalledWith({ transaction: m.transacao });
        expect(m.encerrarPorCancelamento).toHaveBeenCalledWith("cd-1", { transaction: m.transacao });
        expect(m.transacao.commit).toHaveBeenCalled();
    });

    it("outra pessoa não cancela a candidatura de Ana", async () => {
        m.candidaturaFindByPk.mockResolvedValue({ id: "cd-1", candidato: { usuarioId: "u-ana" }, save: vi.fn() });

        await expect(Servico.cancelar("cd-1", { id: "u-outro", tipoUsuario: "candidato" })).rejects.toThrow(/suas próprias/i);
        expect(m.encerrarPorCancelamento).not.toHaveBeenCalled();
    });
});
