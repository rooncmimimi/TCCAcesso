import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O administrador criando vaga em nome de uma empresa.
 *
 * O que estes testes seguram é a fronteira de quem pode dizer "para qual empresa": só o
 * administrador, e só para empresa APROVADA. A conta de empresa nunca escolhe — mesmo que mande
 * `empresaId` no corpo, a vaga nasce na empresa da sessão. Banco simulado.
 */

const m = vi.hoisted(() => {
    const transacao = { commit: vi.fn(), rollback: vi.fn() };

    return {
        transacao,
        vagaCreate: vi.fn(),
        vagaFindByPk: vi.fn(),
        empresaFindOne: vi.fn(),
        empresaFindByPk: vi.fn(),
        auditar: vi.fn()
    };
});

vi.mock("../config/bancoDeDados.js", () => ({
    default: { transaction: vi.fn().mockResolvedValue(m.transacao), fn: vi.fn(), col: vi.fn(), define: vi.fn(() => ({})) }
}));
vi.mock("../models/index.js", () => ({
    Vaga: { create: m.vagaCreate, findByPk: m.vagaFindByPk },
    Empresa: { findOne: m.empresaFindOne, findByPk: m.empresaFindByPk },
    Usuario: {},
    Candidatura: {}
}));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: m.auditar } }));

const { default: Servico } = await import("./VagaService.js");

const ADMIN = { id: "u-admin", tipoUsuario: "administrador" };
const EMPRESA_A = { id: "u-emp-a", tipoUsuario: "empresa" };
const CORPO = { titulo: "Analista de suporte", descricao: "Descrição com mais de vinte caracteres." };
const CONTEXTO = { ip: "10.0.0.1", userAgent: "teste" };

const empresaAprovada = (id = "emp-b") => ({
    id,
    usuarioId: "u-emp-b",
    statusAprovacao: "aprovada",
    nomeFantasia: "Padaria Estrela",
    razaoSocial: "Padaria Estrela Ltda"
});

beforeEach(() => {
    vi.clearAllMocks();
    m.empresaFindOne.mockResolvedValue({ id: "emp-a", usuarioId: "u-emp-a", statusAprovacao: "aprovada" });
    m.empresaFindByPk.mockResolvedValue(empresaAprovada());
    m.vagaCreate.mockResolvedValue({ id: "v1", titulo: CORPO.titulo });
    m.vagaFindByPk.mockResolvedValue({ id: "v1", empresa: { usuarioId: "u-emp-b", statusAprovacao: "aprovada" } });
});

describe("administrador cria vaga em nome de uma empresa", () => {
    it("a vaga nasce na empresa escolhida, e não numa empresa do próprio administrador", async () => {
        await Servico.criar({ ...CORPO, empresaId: "emp-b" }, ADMIN, CONTEXTO);

        expect(m.empresaFindByPk).toHaveBeenCalledWith("emp-b");
        expect(m.empresaFindOne).not.toHaveBeenCalled();
        expect(m.vagaCreate.mock.calls[0][0]).toMatchObject({ empresaId: "emp-b", titulo: CORPO.titulo, status: "aberta" });
    });

    it("sem dizer a empresa, é erro de requisição — não chuta uma", async () => {
        await expect(Servico.criar(CORPO, ADMIN, CONTEXTO)).rejects.toMatchObject({ statusCode: 400 });

        expect(m.vagaCreate).not.toHaveBeenCalled();
    });

    it("empresa que não existe é 404", async () => {
        m.empresaFindByPk.mockResolvedValue(null);

        await expect(Servico.criar({ ...CORPO, empresaId: "nao-existe" }, ADMIN, CONTEXTO)).rejects.toMatchObject({ statusCode: 404 });
        expect(m.vagaCreate).not.toHaveBeenCalled();
    });

    it.each(["pendente", "reprovada", "suspensa"])("empresa %s não recebe vaga, nem pelo administrador", async (status) => {
        m.empresaFindByPk.mockResolvedValue({ ...empresaAprovada(), statusAprovacao: status });

        await expect(Servico.criar({ ...CORPO, empresaId: "emp-b" }, ADMIN, CONTEXTO)).rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringMatching(/empresa aprovada/i)
        });
        expect(m.vagaCreate).not.toHaveBeenCalled();
    });

    it("fica no log de auditoria, com quem criou, para qual empresa e de onde", async () => {
        await Servico.criar({ ...CORPO, empresaId: "emp-b" }, ADMIN, CONTEXTO);

        expect(m.auditar).toHaveBeenCalledTimes(1);
        expect(m.auditar.mock.calls[0][0]).toMatchObject({
            administradorId: "u-admin",
            acao: "criar_vaga",
            entidadeTipo: "vaga",
            entidadeId: "v1",
            metadados: { empresaId: "emp-b" },
            ip: "10.0.0.1",
            userAgent: "teste"
        });
        expect(m.auditar.mock.calls[0][0].descricao).toMatch(/Padaria Estrela/);
    });
});

describe("a conta de empresa continua publicando só na própria empresa", () => {
    it("a vaga nasce na empresa da sessão", async () => {
        await Servico.criar(CORPO, EMPRESA_A, CONTEXTO);

        expect(m.empresaFindOne).toHaveBeenCalled();
        expect(m.vagaCreate.mock.calls[0][0].empresaId).toBe("emp-a");
    });

    it("mandar `empresaId` de outra empresa no corpo não muda nada", async () => {
        await Servico.criar({ ...CORPO, empresaId: "emp-b" }, EMPRESA_A, CONTEXTO);

        expect(m.empresaFindByPk).not.toHaveBeenCalled();
        expect(m.vagaCreate.mock.calls[0][0].empresaId).toBe("emp-a");
    });

    it("não vai para a auditoria: não é ato de moderação", async () => {
        await Servico.criar(CORPO, EMPRESA_A, CONTEXTO);

        expect(m.auditar).not.toHaveBeenCalled();
    });

    it("empresa ainda em análise continua barrada", async () => {
        m.empresaFindOne.mockResolvedValue({ id: "emp-a", usuarioId: "u-emp-a", statusAprovacao: "pendente" });

        await expect(Servico.criar(CORPO, EMPRESA_A, CONTEXTO)).rejects.toMatchObject({ statusCode: 403 });
        expect(m.vagaCreate).not.toHaveBeenCalled();
    });
});
