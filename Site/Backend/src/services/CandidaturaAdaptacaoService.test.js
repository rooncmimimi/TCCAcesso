import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A cópia de adaptações por candidatura: autorização explícita, conteúdo vindo do servidor, retirada
 * que apaga, e quem pode ler ou responder. Banco e models mockados (o projeto não tem banco de teste
 * isolado); o que está em jogo aqui são as REGRAS do service.
 */

const m = vi.hoisted(() => ({
    candidatoFindOne: vi.fn(),
    candidaturaFindByPk: vi.fn(),
    adaptacaoCreate: vi.fn(),
    adaptacaoFindOne: vi.fn(),
    adaptacaoFindAll: vi.fn(),
    carregarParaCopia: vi.fn(),
    auditar: vi.fn(),
    notificar: vi.fn(),
    vagaFindByPk: vi.fn(),
    contar: vi.fn()
}));

vi.mock("../models/index.js", () => ({
    Candidato: { findOne: m.candidatoFindOne },
    Candidatura: { findByPk: m.candidaturaFindByPk },
    CandidaturaAdaptacao: { create: m.adaptacaoCreate, findOne: m.adaptacaoFindOne, findAll: m.adaptacaoFindAll },
    CandidatoExperiencia: { count: m.contar },
    CandidatoFormacao: { count: m.contar },
    CandidatoHabilidade: { count: m.contar },
    Empresa: {},
    Usuario: {},
    Vaga: { findByPk: m.vagaFindByPk }
}));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: m.auditar } }));
vi.mock("./MinhaAcessibilidadeService.js", () => ({ default: { carregarParaCopia: m.carregarParaCopia } }));
vi.mock("./NotificacaoService.js", () => ({
    default: { criar: m.notificar, emitirNotificacaoCriada: vi.fn(), contarNaoLidasDe: vi.fn().mockResolvedValue(1) }
}));
vi.mock("./BloqueioService.js", () => ({ default: { estaBloqueadoEntre: vi.fn().mockResolvedValue(false) } }));

const { default: Servico } = await import("./CandidaturaAdaptacaoService.js");

const CANDIDATO = { id: "cand-1", usuarioId: "u-ana", curriculo: "x.pdf", curriculoNome: "Meu CV.pdf" };
const PERFIL = { adaptacoes: ["legendas", "tempo_adicional", "instrucoes_escritas"], observacao: "Só por escrito, por favor" };
const COMUNICACAO = { canaisPreferidos: ["chat"], canaisAEvitar: ["ligacao"], melhorHorario: "À tarde", observacao: null };

beforeEach(() => {
    vi.clearAllMocks();
    m.carregarParaCopia.mockResolvedValue({
        perfil: PERFIL,
        comunicacao: COMUNICACAO,
        deficiencias: [{ id: "d1", nome: "Deficiência auditiva" }]
    });
    m.adaptacaoCreate.mockImplementation(async (valores) => ({ ...valores, versao: valores.versao ?? 1 }));
});

describe("registrar (no envio da candidatura)", () => {
    it("sem nenhuma escolha, não cria registro nenhum: nada é compartilhado por padrão", async () => {
        const r = await Servico.registrar({ candidato: CANDIDATO, candidaturaId: "cd-1", corpo: {}, aceita: true });

        expect(r).toBeNull();
        expect(m.adaptacaoCreate).not.toHaveBeenCalled();
    });

    it("com escolha mas SEM a confirmação da autorização, recusa (enviar a candidatura não é autorizar)", async () => {
        await expect(
            Servico.registrar({ candidato: CANDIDATO, candidaturaId: "cd-1", corpo: { adaptacoes: ["legendas"] }, aceita: undefined })
        ).rejects.toThrow(/confirme a autoriza/i);

        expect(m.adaptacaoCreate).not.toHaveBeenCalled();
    });

    it("grava só as duas adaptações escolhidas, em cópia própria, e audita sem o conteúdo", async () => {
        await Servico.registrar({
            candidato: CANDIDATO,
            candidaturaId: "cd-1",
            corpo: { adaptacoes: ["legendas", "tempo_adicional"] },
            aceita: true
        });

        const gravado = m.adaptacaoCreate.mock.calls[0][0];
        expect(gravado.itens.adaptacoes.map((a) => a.chave)).toEqual(["legendas", "tempo_adicional"]);
        expect(JSON.stringify(gravado.itens)).not.toContain("instrucoes_escritas");
        expect(JSON.stringify(gravado.itens)).not.toContain("Só por escrito");
        expect(gravado.totalItens).toBe(2);
        expect(gravado.estado).toBe("ativa");
        expect(gravado.termoVersao).toMatch(/^adaptacoes-/);

        const auditoria = m.auditar.mock.calls[0][0];
        expect(auditoria.acao).toBe("adaptacoes_autorizadas");
        expect(auditoria.entidadeId).toBe("cd-1");
        expect(JSON.stringify(auditoria)).not.toContain("legendas");
    });

    it("o cliente não manda conteúdo: o que vale é o perfil lido no servidor, mesmo com campos extras no corpo", async () => {
        await Servico.registrar({
            candidato: CANDIDATO,
            candidaturaId: "cd-1",
            corpo: { adaptacoes: ["legendas"], itens: { adaptacoes: [{ chave: "inventada", rotulo: "Inventada" }] }, cpf: "123" },
            aceita: true
        });

        const gravado = m.adaptacaoCreate.mock.calls[0][0];
        expect(JSON.stringify(gravado)).not.toContain("inventada");
        expect(JSON.stringify(gravado)).not.toContain("123");
    });

    it("recusa adaptação fora do catálogo", async () => {
        await expect(
            Servico.registrar({ candidato: CANDIDATO, candidaturaId: "cd-1", corpo: { adaptacoes: ["x"] }, aceita: true })
        ).rejects.toThrow(/não existem na lista/i);
    });
});

describe("a prévia mostra exatamente o que será gravado", () => {
    it("usa o mesmo conteúdo que o registro gravaria e lista o que nunca é compartilhado", async () => {
        m.candidatoFindOne.mockResolvedValue({
            ...CANDIDATO,
            tituloProfissional: "Analista",
            usuario: { nome: "Ana", email: "ana@exemplo.com" },
            biografia: "oi"
        });
        m.vagaFindByPk.mockResolvedValue({ id: "v1", titulo: "Vaga", empresa: { nomeFantasia: "Acme" } });
        m.contar.mockResolvedValue(2);
        const corpo = { adaptacoes: ["legendas"], deficiencia: true };

        const previa = await Servico.montarPrevia("v1", corpo, { id: "u-ana" });
        await Servico.registrar({ candidato: CANDIDATO, candidaturaId: "cd-1", corpo, aceita: true });

        expect(previa.adaptacoes.itens).toEqual(m.adaptacaoCreate.mock.calls[0][0].itens);
        expect(previa.adaptacoes.total).toBe(m.adaptacaoCreate.mock.calls[0][0].totalItens);
        expect(previa.dadosProfissionais.emailDeContato).toBe("ana@exemplo.com");
        expect(previa.naoCompartilhado.join(" ")).toMatch(/CPF/);
        expect(previa.naoCompartilhado.join(" ")).toMatch(/Endereço/);
        expect(JSON.stringify(previa)).not.toContain("Só por escrito");
    });

    it("quem não é candidato não tem prévia", async () => {
        m.candidatoFindOne.mockResolvedValue(null);

        await expect(Servico.montarPrevia("v1", {}, { id: "u-empresa" })).rejects.toThrow(/apenas candidatos/i);
    });
});

describe("retirar e editar (só a própria pessoa)", () => {
    const candidaturaDe = (usuarioId, status = "pendente") => ({ id: "cd-1", status, candidato: { id: "cand-1", usuarioId } });

    it("outra pessoa, e nem o administrador, retira a autorização de alguém", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidaturaDe("u-ana"));

        await expect(Servico.retirar("cd-1", { id: "u-outra", tipoUsuario: "candidato" })).rejects.toThrow(/suas próprias/i);
        await expect(Servico.retirar("cd-1", { id: "u-admin", tipoUsuario: "administrador" })).rejects.toThrow(/suas próprias/i);
        expect(m.adaptacaoFindOne).not.toHaveBeenCalled();
    });

    it("retirar APAGA o conteúdo, guarda só o registro mínimo e audita", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidaturaDe("u-ana"));
        const cadastro = {
            estado: "ativa",
            versao: 2,
            totalItens: 2,
            itens: { adaptacoes: [{ chave: "legendas" }] },
            resposta: "podemos_oferecer",
            update: vi.fn().mockImplementation(async function (valores) {
                Object.assign(this, valores);
                return this;
            })
        };
        m.adaptacaoFindOne.mockResolvedValue(cadastro);

        const visao = await Servico.retirar("cd-1", { id: "u-ana", tipoUsuario: "candidato" });

        const atualizacao = cadastro.update.mock.calls[0][0];
        expect(atualizacao.estado).toBe("retirada");
        expect(atualizacao.itens).toBeNull();
        expect(atualizacao.retiradoEm).toBeInstanceOf(Date);
        expect(atualizacao.resposta).toBeNull();
        expect(visao.itens).toBeNull();
        expect(m.auditar.mock.calls[0][0].acao).toBe("adaptacoes_retiradas");
    });

    it("retirar duas vezes não faz nada na segunda", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidaturaDe("u-ana"));
        m.adaptacaoFindOne.mockResolvedValue({ estado: "retirada", update: vi.fn() });

        expect(await Servico.retirar("cd-1", { id: "u-ana" })).toBeNull();
        expect(m.auditar).not.toHaveBeenCalled();
    });

    it("editar cria uma nova versão, refaz a cópia e zera a resposta antiga da empresa", async () => {
        m.candidaturaFindByPk.mockResolvedValue({ ...candidaturaDe("u-ana"), candidato: { id: "cand-1", usuarioId: "u-ana" } });
        const existente = { versao: 1, update: vi.fn().mockImplementation(async (v) => ({ ...v })) };
        m.adaptacaoFindOne.mockResolvedValue(existente);

        await Servico.editar("cd-1", { adaptacoes: ["tempo_adicional"], aceita: true }, { id: "u-ana" });

        const campos = existente.update.mock.calls[0][0];
        expect(campos.versao).toBe(2);
        expect(campos.itens.adaptacoes.map((a) => a.chave)).toEqual(["tempo_adicional"]);
        expect(campos.resposta).toBeNull();
        expect(campos.retiradoEm).toBeNull();
    });

    it("editar sem confirmar a autorização é recusado, e candidatura encerrada não aceita edição", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidaturaDe("u-ana"));
        await expect(Servico.editar("cd-1", { adaptacoes: ["legendas"] }, { id: "u-ana" })).rejects.toThrow(/confirme a autoriza/i);

        m.candidaturaFindByPk.mockResolvedValue(candidaturaDe("u-ana", "cancelada"));
        await expect(Servico.editar("cd-1", { adaptacoes: ["legendas"], aceita: true }, { id: "u-ana" })).rejects.toThrow(/encerrada/i);
    });

    it("editar sem nenhum item vira retirada", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidaturaDe("u-ana"));
        const cadastro = { estado: "ativa", versao: 1, totalItens: 1, update: vi.fn().mockResolvedValue({}) };
        m.adaptacaoFindOne.mockResolvedValue(cadastro);

        await Servico.editar("cd-1", { adaptacoes: [], aceita: true }, { id: "u-ana" });

        expect(cadastro.update.mock.calls[0][0].estado).toBe("retirada");
    });
});

describe("o que a EMPRESA enxerga", () => {
    it("só cópias ativas de candidaturas ativas", async () => {
        m.adaptacaoFindAll.mockResolvedValue([
            { candidaturaId: "a", versao: 1, finalidade: "processo_seletivo", autorizadoEm: "d", itens: { adaptacoes: [{ chave: "legendas" }] } }
        ]);

        const mapa = await Servico.paraAEmpresa([
            { id: "a", status: "pendente" },
            { id: "b", status: "cancelada" },
            { id: "c", status: "rejeitada" }
        ]);

        const consulta = m.adaptacaoFindAll.mock.calls[0][0];
        expect(consulta.where.candidaturaId).toEqual(["a"]);
        expect(consulta.where.estado).toBe("ativa");
        expect(mapa.get("a").itens.adaptacoes).toHaveLength(1);
        expect(mapa.has("b")).toBe(false);
        expect(mapa.has("c")).toBe(false);
    });

    it("a visão da empresa não traz estado interno nem totais: só o que foi autorizado e a resposta", async () => {
        m.adaptacaoFindAll.mockResolvedValue([{ candidaturaId: "a", versao: 3, finalidade: "processo_seletivo", autorizadoEm: "d", itens: {}, totalItens: 7, estado: "ativa", termoVersao: "x" }]);

        const visao = (await Servico.paraAEmpresa([{ id: "a", status: "pendente" }])).get("a");

        expect(Object.keys(visao).sort()).toEqual(["autorizadoEm", "finalidade", "itens", "resposta", "respostaMensagem", "respondidoEm", "versao"].sort());
    });

    it("sem nenhuma candidatura ativa, nem consulta o banco", async () => {
        const mapa = await Servico.paraAEmpresa([{ id: "b", status: "cancelada" }]);

        expect(mapa.size).toBe(0);
        expect(m.adaptacaoFindAll).not.toHaveBeenCalled();
    });
});

describe("responder (só a empresa dona da vaga)", () => {
    const candidatura = (donoDaVaga, status = "em_analise") => ({
        id: "cd-1",
        status,
        vaga: { id: "v1", titulo: "Vaga", empresa: { usuarioId: donoDaVaga, statusAprovacao: "aprovada" } },
        candidato: { id: "cand-1", usuarioId: "u-ana" }
    });

    it("recusa resposta fora da lista", async () => {
        await expect(Servico.responder("cd-1", { resposta: "talvez" }, { id: "u-emp" })).rejects.toThrow(/respostas disponíveis/i);
    });

    it("outra empresa (de outra organização) não responde, e o administrador também não", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura("u-emp-a"));

        await expect(Servico.responder("cd-1", { resposta: "podemos_oferecer" }, { id: "u-emp-b", tipoUsuario: "empresa" })).rejects.toThrow(/dona da vaga/i);
        await expect(Servico.responder("cd-1", { resposta: "podemos_oferecer" }, { id: "u-admin", tipoUsuario: "administrador" })).rejects.toThrow(/dona da vaga/i);
        expect(m.adaptacaoFindOne).not.toHaveBeenCalled();
    });

    it("sem cópia ativa (nunca houve pedido, ou foi retirado), responde 'não há pedido', sem revelar qual dos dois", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura("u-emp-a"));
        m.adaptacaoFindOne.mockResolvedValue(null);

        await expect(Servico.responder("cd-1", { resposta: "podemos_oferecer" }, { id: "u-emp-a", tipoUsuario: "empresa" })).rejects.toThrow(/não há pedido/i);
        expect(m.adaptacaoFindOne.mock.calls[0][0].where.estado).toBe("ativa");
    });

    it("candidatura cancelada ou rejeitada não recebe resposta", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura("u-emp-a", "rejeitada"));

        await expect(Servico.responder("cd-1", { resposta: "podemos_oferecer" }, { id: "u-emp-a", tipoUsuario: "empresa" })).rejects.toThrow(/encerrada/i);
    });

    it("a empresa dona responde, a resposta é registrada e a pessoa é avisada sem conteúdo sensível", async () => {
        m.candidaturaFindByPk.mockResolvedValue(candidatura("u-emp-a"));
        const cadastro = { versao: 1, totalItens: 2, itens: {}, finalidade: "processo_seletivo", autorizadoEm: "d", update: vi.fn().mockResolvedValue({}) };
        m.adaptacaoFindOne.mockResolvedValue(cadastro);
        m.notificar.mockResolvedValue({ id: "n1" });

        await Servico.responder("cd-1", { resposta: "podemos_providenciar", mensagem: "Teremos intérprete." }, { id: "u-emp-a", tipoUsuario: "empresa" });

        const campos = cadastro.update.mock.calls[0][0];
        expect(campos.resposta).toBe("podemos_providenciar");
        expect(campos.respostaMensagem).toBe("Teremos intérprete.");
        expect(m.notificar.mock.calls[0][0].usuarioId).toBe("u-ana");
        expect(JSON.stringify(m.notificar.mock.calls[0][0])).not.toMatch(/legendas|tempo_adicional|intérprete/i);
        expect(m.auditar.mock.calls[0][0].acao).toBe("adaptacoes_respondidas");
    });
});

describe("encerramento por cancelamento", () => {
    it("apaga o conteúdo ao cancelar a candidatura", async () => {
        const cadastro = { estado: "ativa", versao: 1, totalItens: 1, update: vi.fn().mockResolvedValue({}) };
        m.adaptacaoFindOne.mockResolvedValue(cadastro);

        await Servico.encerrarPorCancelamento("cd-1", { transaction: {} });

        expect(cadastro.update.mock.calls[0][0].itens).toBeNull();
        expect(m.auditar.mock.calls[0][0].acao).toBe("adaptacoes_encerradas");
    });
});
