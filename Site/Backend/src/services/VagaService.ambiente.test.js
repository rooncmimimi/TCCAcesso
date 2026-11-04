import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ambiente de trabalho da vaga (Bloco 3): listas fechadas recusam o que não existe, a empresa só
 * DECLARA a acessibilidade física e só a moderação verifica. Banco simulado.
 */

const m = vi.hoisted(() => {
    const transacao = { commit: vi.fn(), rollback: vi.fn() };

    return { transacao, vagaCreate: vi.fn(), vagaFindByPk: vi.fn(), empresaFindOne: vi.fn(), auditar: vi.fn() };
});

vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn().mockResolvedValue(m.transacao), fn: vi.fn(), col: vi.fn(), define: vi.fn(() => ({})) } }));
vi.mock("../models/index.js", () => ({
    Vaga: { create: m.vagaCreate, findByPk: m.vagaFindByPk },
    Empresa: { findOne: m.empresaFindOne },
    Usuario: {},
    Candidatura: {}
}));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: m.auditar } }));

const { default: Servico } = await import("./VagaService.js");

const EMPRESA = { id: "u-emp", tipoUsuario: "empresa" };
const ADMIN = { id: "u-admin", tipoUsuario: "administrador" };
const CORPO_BASE = { titulo: "Analista", descricao: "Descrição com mais de vinte caracteres." };

function vagaExistente(acessibilidadeFisica = {}) {
    return {
        id: "v1",
        titulo: "Analista",
        acessibilidadeFisica,
        empresa: { usuarioId: "u-emp", statusAprovacao: "aprovada" },
        update: vi.fn().mockResolvedValue(undefined)
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    m.empresaFindOne.mockResolvedValue({ id: "emp-1", usuarioId: "u-emp", statusAprovacao: "aprovada" });
    m.vagaCreate.mockResolvedValue({ id: "v1" });
    m.vagaFindByPk.mockResolvedValue({ id: "v1", empresa: { usuarioId: "u-emp", statusAprovacao: "aprovada" } });
});

describe("criar", () => {
    it("grava a entrevista, a prévia sensorial e o mapa já normalizados", async () => {
        await Servico.criar(
            {
                ...CORPO_BASE,
                entrevistaAdaptacoes: ["tempo_adicional", "interprete_libras", "tempo_adicional"],
                ambienteSensorial: { ruido: "silencioso", rotina: "  Das 9h  às 17h " },
                acessibilidadeFisica: { rampa: { situacao: "sim", detalhe: "Na entrada" } }
            },
            EMPRESA
        );

        const gravado = m.vagaCreate.mock.calls[0][0];
        expect(gravado.entrevistaAdaptacoes).toEqual(["interprete_libras", "tempo_adicional"]);
        expect(gravado.ambienteSensorial).toEqual({ ruido: "silencioso", rotina: "Das 9h às 17h" });
        expect(gravado.acessibilidadeFisica).toEqual({ rampa: { situacao: "sim", origem: "declarado", detalhe: "Na entrada" } });
    });

    it("a empresa NÃO consegue se declarar 'verificada': a origem enviada pelo cliente é ignorada", async () => {
        await Servico.criar({ ...CORPO_BASE, acessibilidadeFisica: { elevador: { situacao: "sim", origem: "verificado", verificadoEm: "2026-01-01T00:00:00Z" } } }, EMPRESA);

        const item = m.vagaCreate.mock.calls[0][0].acessibilidadeFisica.elevador;
        expect(item.origem).toBe("declarado");
        expect(item.verificadoEm).toBeUndefined();
    });

    it("sem nada informado, não inventa nada (campos ausentes ficam ausentes)", async () => {
        await Servico.criar(CORPO_BASE, EMPRESA);

        const gravado = m.vagaCreate.mock.calls[0][0];
        expect(gravado.entrevistaAdaptacoes).toBeUndefined();
        expect(gravado.ambienteSensorial).toBeUndefined();
        expect(gravado.acessibilidadeFisica).toBeUndefined();
    });

    it.each([
        ["adaptação de entrevista que não existe", { entrevistaAdaptacoes: ["leitor_de_tela"] }],
        ["valor fora da lista na prévia sensorial", { ambienteSensorial: { ruido: "ensurdecedor" } }],
        ["característica desconhecida", { ambienteSensorial: { cheiro: "forte" } }],
        ["situação inválida no mapa", { acessibilidadeFisica: { rampa: { situacao: "talvez" } } }],
        ["item desconhecido no mapa", { acessibilidadeFisica: { helipoleto: { situacao: "sim" } } }]
    ])("recusa %s com 400 e não grava nada", async (_nome, extra) => {
        await expect(Servico.criar({ ...CORPO_BASE, ...extra }, EMPRESA)).rejects.toMatchObject({ statusCode: 400 });

        expect(m.vagaCreate).not.toHaveBeenCalled();
    });

    it("atividades, requisitos desejáveis e etapas passam como texto", async () => {
        await Servico.criar({ ...CORPO_BASE, atividades: "Atender clientes", requisitosDesejaveis: "Inglês", etapasSelecao: "Entrevista" }, EMPRESA);

        expect(m.vagaCreate.mock.calls[0][0]).toMatchObject({ atividades: "Atender clientes", requisitosDesejaveis: "Inglês", etapasSelecao: "Entrevista" });
    });
});

describe("atualizar: a verificação só sobrevive se o item não mudou", () => {
    const verificado = { rampa: { situacao: "sim", origem: "verificado", detalhe: "Entrada", verificadoEm: "2026-11-01T10:00:00.000Z" } };

    it("reenviar o mesmo item mantém o selo", async () => {
        const vaga = vagaExistente(verificado);
        m.vagaFindByPk.mockResolvedValueOnce(vaga).mockResolvedValue(vaga);

        await Servico.atualizar("v1", { acessibilidadeFisica: { rampa: { situacao: "sim", detalhe: "Entrada" } } }, EMPRESA);

        expect(vaga.update.mock.calls[0][0].acessibilidadeFisica.rampa.origem).toBe("verificado");
    });

    it("alterar o item derruba o selo", async () => {
        const vaga = vagaExistente(verificado);
        m.vagaFindByPk.mockResolvedValueOnce(vaga).mockResolvedValue(vaga);

        await Servico.atualizar("v1", { acessibilidadeFisica: { rampa: { situacao: "parcial", detalhe: "Entrada" } } }, EMPRESA);

        expect(vaga.update.mock.calls[0][0].acessibilidadeFisica.rampa).toEqual({ situacao: "parcial", origem: "declarado", detalhe: "Entrada" });
    });

    it("editar só o título não mexe no mapa", async () => {
        const vaga = vagaExistente(verificado);
        m.vagaFindByPk.mockResolvedValueOnce(vaga).mockResolvedValue(vaga);

        await Servico.atualizar("v1", { titulo: "Novo título" }, EMPRESA);

        expect(vaga.update.mock.calls[0][0].acessibilidadeFisica).toBeUndefined();
    });

    it("dado inválido: 400 e rollback", async () => {
        const vaga = vagaExistente();
        m.vagaFindByPk.mockResolvedValueOnce(vaga);

        await expect(Servico.atualizar("v1", { ambienteSensorial: { ruido: "x" } }, EMPRESA)).rejects.toMatchObject({ statusCode: 400 });

        expect(m.transacao.rollback).toHaveBeenCalled();
        expect(vaga.update).not.toHaveBeenCalled();
    });
});

describe("verificarAcessibilidadeFisica: só a moderação", () => {
    const declarado = { rampa: { situacao: "sim", origem: "declarado" }, elevador: { situacao: "nao", origem: "declarado" } };

    it("a própria empresa não verifica o mapa dela", async () => {
        await expect(Servico.verificarAcessibilidadeFisica("v1", { itens: ["rampa"], verificado: true }, EMPRESA)).rejects.toMatchObject({ statusCode: 403 });

        expect(m.vagaFindByPk).not.toHaveBeenCalled();
    });

    it("o administrador verifica, a vaga é atualizada e a auditoria não copia o mapa", async () => {
        const vaga = vagaExistente(declarado);
        m.vagaFindByPk.mockResolvedValue(vaga);

        const r = await Servico.verificarAcessibilidadeFisica("v1", { itens: ["rampa"], verificado: true }, ADMIN, { ip: "1.2.3.4" });

        expect(r.alteradas).toEqual(["rampa"]);
        expect(vaga.update.mock.calls[0][0].acessibilidadeFisica.rampa.origem).toBe("verificado");
        expect(vaga.update.mock.calls[0][0].acessibilidadeFisica.rampa.verificadoEm).toBeTruthy();
        const auditoria = m.auditar.mock.calls[0][0];
        expect(auditoria).toMatchObject({ administradorId: "u-admin", acao: "verificar_acessibilidade_fisica", entidadeTipo: "vaga", entidadeId: "v1" });
        expect(auditoria.metadados).toEqual({ itens: ["rampa"] });
    });

    it("sem mudança real, não grava nem audita", async () => {
        const vaga = vagaExistente({ rampa: { situacao: "sim", origem: "verificado", verificadoEm: "x" } });
        m.vagaFindByPk.mockResolvedValue(vaga);

        const r = await Servico.verificarAcessibilidadeFisica("v1", { itens: ["rampa"], verificado: true }, ADMIN);

        expect(r.alteradas).toEqual([]);
        expect(vaga.update).not.toHaveBeenCalled();
        expect(m.auditar).not.toHaveBeenCalled();
    });

    it("recusa item desconhecido, lista vazia e verificado que não é booleano", async () => {
        await expect(Servico.verificarAcessibilidadeFisica("v1", { itens: ["x"], verificado: true }, ADMIN)).rejects.toMatchObject({ statusCode: 400 });
        await expect(Servico.verificarAcessibilidadeFisica("v1", { itens: [], verificado: true }, ADMIN)).rejects.toMatchObject({ statusCode: 400 });
        await expect(Servico.verificarAcessibilidadeFisica("v1", { itens: ["rampa"], verificado: "sim" }, ADMIN)).rejects.toMatchObject({ statusCode: 400 });
    });
});
