import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * "Atribuir a mim" nas denúncias e o que a moderação enxerga: quem é o responsável, o conteúdo
 * denunciado, o histórico de tratamento e os filtros da fila.
 *
 * Sem banco real: modelos, transação e serviços colaboradores são simulados (mesmo padrão dos outros
 * testes de serviço); `ErroApi` e a lógica do serviço são os reais.
 */

const { transacao } = vi.hoisted(() => ({
    transacao: { commit: vi.fn(), rollback: vi.fn(), LOCK: { UPDATE: "UPDATE" } }
}));

vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn(async () => transacao) } }));
vi.mock("../models/index.js", () => ({
    Usuario: { findByPk: vi.fn() },
    Postagem: { findByPk: vi.fn() },
    Comentario: { findByPk: vi.fn() },
    Vaga: { findByPk: vi.fn() },
    Empresa: { findByPk: vi.fn() },
    Mensagem: {},
    Denuncia: { findByPk: vi.fn(), findAndCountAll: vi.fn() },
    RegistroAuditoria: { findAll: vi.fn() }
}));
vi.mock("./NotificacaoService.js", () => ({ default: {} }));
vi.mock("./AdminUsuarioService.js", () => ({ default: {} }));
vi.mock("./AdminConteudoService.js", () => ({ default: {} }));
vi.mock("./AdminEmpresaService.js", () => ({ default: {} }));
vi.mock("./ConversaService.js", () => ({ default: {} }));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: vi.fn() } }));

const sequelize = (await import("../config/bancoDeDados.js")).default;
const { Denuncia, Usuario, Postagem, Vaga, Empresa, RegistroAuditoria } = await import("../models/index.js");
const { default: AdminAuditoriaService } = await import("./AdminAuditoriaService.js");
const { default: DenunciaService } = await import("./DenunciaService.js");

const ADMIN = { id: "admin-1", nome: "Ana Admin", tipoUsuario: "administrador" };
const OUTRO_ADMIN_ID = "admin-2";

function denunciaDoBanco(extra = {}) {
    const d = {
        id: "d1",
        status: "pendente",
        entidadeTipo: "postagem",
        entidadeId: "p1",
        administradorResponsavelId: null,
        update: vi.fn(async (valores) => Object.assign(d, valores)),
        toJSON() {
            return { id: this.id, status: this.status, entidadeTipo: this.entidadeTipo, entidadeId: this.entidadeId };
        },
        ...extra
    };

    return d;
}

beforeEach(() => {
    vi.resetAllMocks();
    sequelize.transaction.mockImplementation(async () => transacao);
});

describe("DenunciaService.atribuir", () => {
    it("o administrador assume uma denúncia sem responsável: o responsável é ele, vira 'em análise' e fica auditado", async () => {
        const d = denunciaDoBanco();
        Denuncia.findByPk.mockResolvedValueOnce(d).mockResolvedValueOnce({ id: "d1", administradorResponsavel: { id: ADMIN.id, nome: ADMIN.nome } });

        const resultado = await DenunciaService.atribuir("d1", ADMIN, { ip: "1.2.3.4" });

        expect(d.update).toHaveBeenCalledWith({ status: "em_analise", administradorResponsavelId: ADMIN.id }, { transaction: transacao });
        expect(transacao.commit).toHaveBeenCalled();
        expect(AdminAuditoriaService.registrar).toHaveBeenCalledWith(
            expect.objectContaining({
                administradorId: ADMIN.id,
                acao: "atribuir_denuncia",
                entidadeTipo: "denuncia",
                entidadeId: "d1",
                descricao: "Denúncia atribuída a Ana Admin.",
                metadados: expect.objectContaining({ responsavelAnteriorId: null })
            })
        );
        // O que volta já traz o responsável, para a tela mostrar o que a API confirmou.
        expect(resultado.administradorResponsavel).toEqual({ id: ADMIN.id, nome: ADMIN.nome });
        expect(Denuncia.findByPk).toHaveBeenLastCalledWith("d1", { include: expect.any(Array) });
    });

    it("trava a linha na leitura, para dois administradores não assumirem ao mesmo tempo", async () => {
        Denuncia.findByPk.mockResolvedValueOnce(denunciaDoBanco()).mockResolvedValueOnce({});

        await DenunciaService.atribuir("d1", ADMIN);

        expect(Denuncia.findByPk).toHaveBeenNthCalledWith(1, "d1", { transaction: transacao, lock: "UPDATE" });
    });

    it.each([
        ["candidato", { id: "u1", nome: "Cris", tipoUsuario: "candidato" }],
        ["empresa", { id: "u2", nome: "Emp", tipoUsuario: "empresa" }],
        ["ninguém identificado", null],
        ["sem tipo", { id: "u3", nome: "X" }]
    ])("recusa quem não é administrador (%s) sem tocar no banco", async (_nome, solicitante) => {
        await expect(DenunciaService.atribuir("d1", solicitante)).rejects.toMatchObject({ statusCode: 403 });

        expect(sequelize.transaction).not.toHaveBeenCalled();
        expect(Denuncia.findByPk).not.toHaveBeenCalled();
        expect(AdminAuditoriaService.registrar).not.toHaveBeenCalled();
    });

    it("não há como atribuir a outra pessoa: o responsável gravado é sempre o solicitante", async () => {
        const d = denunciaDoBanco();
        Denuncia.findByPk.mockResolvedValueOnce(d).mockResolvedValueOnce({});

        await DenunciaService.atribuir("d1", ADMIN, {}, { forcar: false, administradorResponsavelId: "invasor" });

        expect(d.administradorResponsavelId).toBe(ADMIN.id);
    });

    it("se já é minha, nada muda e nada é registrado de novo (idempotente)", async () => {
        const d = denunciaDoBanco({ status: "em_analise", administradorResponsavelId: ADMIN.id });
        Denuncia.findByPk.mockResolvedValueOnce(d).mockResolvedValueOnce({ id: "d1" });

        await DenunciaService.atribuir("d1", ADMIN);

        expect(d.update).not.toHaveBeenCalled();
        expect(AdminAuditoriaService.registrar).not.toHaveBeenCalled();
        expect(transacao.commit).toHaveBeenCalled();
    });

    it("se está com outro administrador, recusa com 409 dizendo quem é, sem sobrescrever", async () => {
        const d = denunciaDoBanco({ status: "em_analise", administradorResponsavelId: OUTRO_ADMIN_ID });
        Denuncia.findByPk.mockResolvedValueOnce(d);
        Usuario.findByPk.mockResolvedValueOnce({ nome: "Beto Moderador" });

        await expect(DenunciaService.atribuir("d1", ADMIN)).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining("Beto Moderador")
        });

        expect(d.update).not.toHaveBeenCalled();
        expect(transacao.rollback).toHaveBeenCalled();
        expect(AdminAuditoriaService.registrar).not.toHaveBeenCalled();
    });

    it("com confirmação (forcar), assume a denúncia de outro administrador e registra de quem era", async () => {
        const d = denunciaDoBanco({ status: "em_analise", administradorResponsavelId: OUTRO_ADMIN_ID });
        Denuncia.findByPk.mockResolvedValueOnce(d).mockResolvedValueOnce({});

        await DenunciaService.atribuir("d1", ADMIN, {}, { forcar: true });

        expect(d.update).toHaveBeenCalledWith({ status: "em_analise", administradorResponsavelId: ADMIN.id }, { transaction: transacao });
        expect(AdminAuditoriaService.registrar).toHaveBeenCalledWith(
            expect.objectContaining({
                descricao: "Denúncia assumida por Ana Admin (estava com outro administrador).",
                metadados: expect.objectContaining({ responsavelAnteriorId: OUTRO_ADMIN_ID })
            })
        );
    });

    it.each(["resolvida", "rejeitada", "arquivada"])("não mexe numa denúncia %s", async (status) => {
        Denuncia.findByPk.mockResolvedValueOnce(denunciaDoBanco({ status }));

        await expect(DenunciaService.atribuir("d1", ADMIN)).rejects.toMatchObject({ statusCode: 409 });

        expect(transacao.rollback).toHaveBeenCalled();
        expect(AdminAuditoriaService.registrar).not.toHaveBeenCalled();
    });

    it("denúncia inexistente: 404 e a transação é desfeita", async () => {
        Denuncia.findByPk.mockResolvedValueOnce(null);

        await expect(DenunciaService.atribuir("nao-existe", ADMIN)).rejects.toMatchObject({ statusCode: 404 });

        expect(transacao.rollback).toHaveBeenCalled();
    });
});

describe("DenunciaService.listar (fila)", () => {
    beforeEach(() => {
        Denuncia.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    });

    const filtro = () => Denuncia.findAndCountAll.mock.calls[0][0].where;

    it("'minhas' filtra pelo administrador que pede", async () => {
        await DenunciaService.listar({ atribuicao: "minhas" }, ADMIN);

        expect(filtro()).toEqual({ administradorResponsavelId: ADMIN.id });
    });

    it("'sem_responsavel' pega as que ninguém assumiu", async () => {
        await DenunciaService.listar({ atribuicao: "sem_responsavel" }, ADMIN);

        expect(filtro()).toEqual({ administradorResponsavelId: null });
    });

    it("combina com status, tipo e motivo", async () => {
        await DenunciaService.listar({ atribuicao: "minhas", status: "em_analise", entidadeTipo: "postagem", motivo: "spam" }, ADMIN);

        expect(filtro()).toEqual({
            administradorResponsavelId: ADMIN.id,
            status: "em_analise",
            entidadeTipo: "postagem",
            motivo: "spam"
        });
    });

    it("valor desconhecido de atribuição é ignorado, e 'minhas' sem identificar quem pede também", async () => {
        await DenunciaService.listar({ atribuicao: "qualquer-coisa" }, ADMIN);
        await DenunciaService.listar({ atribuicao: "minhas" }, null);

        expect(Denuncia.findAndCountAll.mock.calls[0][0].where).toEqual({});
        expect(Denuncia.findAndCountAll.mock.calls[1][0].where).toEqual({});
    });
});

describe("DenunciaService.detalhe", () => {
    const denunciaComPartes = () => ({
        id: "d1",
        entidadeTipo: "postagem",
        entidadeId: "p1",
        toJSON: () => ({ id: "d1", entidadeTipo: "postagem", entidadeId: "p1", status: "em_analise" })
    });

    it("traz o conteúdo denunciado com o autor", async () => {
        Denuncia.findByPk.mockResolvedValue(denunciaComPartes());
        Postagem.findByPk.mockResolvedValue({ toJSON: () => ({ id: "p1", conteudo: "texto da postagem", ativo: true, usuarioId: "u9" }) });
        Usuario.findByPk.mockResolvedValue({ toJSON: () => ({ id: "u9", nome: "Autora", tipoUsuario: "candidato" }) });
        RegistroAuditoria.findAll.mockResolvedValue([]);

        const detalhe = await DenunciaService.detalhe("d1");

        expect(detalhe.previaEntidade).toMatchObject({ conteudo: "texto da postagem", autor: { nome: "Autora" } });
    });

    it("para vaga, mostra a empresa que a publicou", async () => {
        Denuncia.findByPk.mockResolvedValue({ ...denunciaComPartes(), entidadeTipo: "vaga", entidadeId: "v1" });
        Vaga.findByPk.mockResolvedValue({ empresaId: "e1", toJSON: () => ({ id: "v1", titulo: "Analista", status: "aberta", empresaId: "e1" }) });
        Empresa.findByPk.mockResolvedValue({ toJSON: () => ({ id: "e1", razaoSocial: "Empresa Exemplo Ltda" }) });
        RegistroAuditoria.findAll.mockResolvedValue([]);

        const detalhe = await DenunciaService.detalhe("d1");

        expect(detalhe.previaEntidade).toMatchObject({ titulo: "Analista", empresa: { razaoSocial: "Empresa Exemplo Ltda" } });
    });

    it("traz o histórico de tratamento em ordem, só com data, ação, descrição e quem agiu", async () => {
        Denuncia.findByPk.mockResolvedValue(denunciaComPartes());
        Postagem.findByPk.mockResolvedValue(null);
        RegistroAuditoria.findAll.mockResolvedValue([
            {
                id: "r1",
                acao: "atribuir_denuncia",
                descricao: "Denúncia atribuída a Ana Admin.",
                criadoEm: "2026-11-02T10:00:00.000Z",
                administrador: { id: "admin-1", nome: "Ana Admin", email: "nao-deve-sair@exemplo.com" },
                ip: "1.2.3.4",
                userAgent: "navegador",
                metadados: { segredo: true }
            }
        ]);

        const detalhe = await DenunciaService.detalhe("d1");

        expect(RegistroAuditoria.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { entidadeTipo: "denuncia", entidadeId: "d1" }, order: [["criadoEm", "ASC"]] })
        );
        expect(detalhe.historico).toEqual([
            {
                id: "r1",
                acao: "atribuir_denuncia",
                descricao: "Denúncia atribuída a Ana Admin.",
                criadoEm: "2026-11-02T10:00:00.000Z",
                administrador: { id: "admin-1", nome: "Ana Admin" }
            }
        ]);
        expect(JSON.stringify(detalhe.historico)).not.toMatch(/1\.2\.3\.4|navegador|segredo|nao-deve-sair/);
    });

    it("conteúdo que não existe mais não quebra o detalhe", async () => {
        Denuncia.findByPk.mockResolvedValue(denunciaComPartes());
        Postagem.findByPk.mockResolvedValue(null);
        RegistroAuditoria.findAll.mockResolvedValue([]);

        const detalhe = await DenunciaService.detalhe("d1");

        expect(detalhe.previaEntidade).toBeNull();
        expect(detalhe.historico).toEqual([]);
    });
});
