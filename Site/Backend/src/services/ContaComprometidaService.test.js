import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * "Acho que invadiram minha conta": o que o `ContaComprometidaService` promete (resposta sempre igual, link de uso único,
 * sessões e confiança encerradas, TOTP intocado). O banco é simulado; a transação real e o efeito sobre o login são conferidos
 * na rodada funcional contra um Postgres descartável.
 */

const { modelos, sessoes, dispositivos, eventos, email, recuperacao, transacao, bcrypt } = vi.hoisted(() => {
    const transacao = { LOCK: { UPDATE: "UPDATE" }, finished: false, commit: vi.fn(), rollback: vi.fn() };

    return {
        modelos: {
            LinkDeSeguranca: { findOne: vi.fn(), create: vi.fn() },
            Usuario: { findOne: vi.fn(), findByPk: vi.fn(), update: vi.fn(), scope: vi.fn() },
            AutenticacaoTotp: { destroy: vi.fn() },
            CodigoRecuperacaoTotp: { destroy: vi.fn() }
        },
        sessoes: { revogarTodos: vi.fn(), revogarTodosExceto: vi.fn() },
        dispositivos: { revogarTodos: vi.fn() },
        eventos: { registrar: vi.fn() },
        email: { enviar: vi.fn() },
        recuperacao: { solicitar: vi.fn() },
        transacao,
        bcrypt: { compararSenha: vi.fn() }
    };
});

vi.mock("../config/env.js", () => ({ default: { seguranca: { dispositivosHabilitado: true } } }));
vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn(async () => transacao) } }));
vi.mock("../models/index.js", () => modelos);
vi.mock("./SessaoService.js", () => ({ default: sessoes }));
vi.mock("./DispositivoConfiavelService.js", () => ({ default: dispositivos }));
vi.mock("./SegurancaEventosService.js", () => ({ default: eventos }));
vi.mock("./EmailService.js", () => ({ default: email }));
vi.mock("./RecuperacaoSenhaService.js", () => ({ default: recuperacao }));
vi.mock("../utils/bcrypt.js", () => bcrypt);
vi.mock("../utils/urlFrontend.js", () => ({
    montarUrlFrontend: vi.fn((caminho, params) => `https://site.exemplo${caminho}?token=${params.token}`)
}));

const { default: Servico } = await import("./ContaComprometidaService.js");
const { hashToken } = await import("../utils/tokens.js");

const usuario = { id: "u1", nome: "Ana", email: "ana@exemplo.com", ativo: true, bloqueado: false };
const CONTEXTO = { ip: "1.1.1.1", userAgent: "ua" };

beforeEach(() => {
    vi.resetAllMocks();
    transacao.finished = false;
    transacao.commit.mockImplementation(async () => {
        transacao.finished = true;
    });
    transacao.rollback.mockImplementation(async () => {
        transacao.finished = true;
    });
    modelos.Usuario.findOne.mockResolvedValue(usuario);
    modelos.LinkDeSeguranca.findOne.mockResolvedValue(null);
    modelos.LinkDeSeguranca.create.mockResolvedValue({});
    email.enviar.mockResolvedValue({});
    recuperacao.solicitar.mockResolvedValue({});
    sessoes.revogarTodos.mockResolvedValue(2);
    dispositivos.revogarTodos.mockResolvedValue(1);
});

describe("solicitar", () => {
    it("conta existente: cria o link de 60 minutos (só o hash) e manda por e-mail", async () => {
        const r = await Servico.solicitar("ANA@exemplo.com", CONTEXTO);

        const gravado = modelos.LinkDeSeguranca.create.mock.calls[0][0];
        const token = /token=([^\s]+)/.exec(email.enviar.mock.calls[0][0].texto)[1];

        expect(r.mensagem).toContain("Se existe uma conta");
        expect(gravado).toMatchObject({ usuarioId: "u1", tipo: "comprometida", tokenHash: hashToken(token) });
        expect(Math.round((gravado.expiraEm.getTime() - Date.now()) / 60_000)).toBe(60);
        expect(email.enviar.mock.calls[0][0]).toMatchObject({ para: "ana@exemplo.com", tag: "conta-comprometida" });
        expect(modelos.Usuario.findOne.mock.calls[0][0].where.email).toBe("ana@exemplo.com");
    });

    it("a resposta é IDÊNTICA para conta existente, inexistente, bloqueada e desativada", async () => {
        const existente = await Servico.solicitar("ana@exemplo.com", CONTEXTO);

        modelos.Usuario.findOne.mockResolvedValue(null);
        const inexistente = await Servico.solicitar("ninguem@exemplo.com", CONTEXTO);

        modelos.Usuario.findOne.mockResolvedValue({ ...usuario, bloqueado: true });
        const bloqueada = await Servico.solicitar("ana@exemplo.com", CONTEXTO);

        modelos.Usuario.findOne.mockResolvedValue({ ...usuario, ativo: false });
        const desativada = await Servico.solicitar("ana@exemplo.com", CONTEXTO);

        expect(inexistente).toEqual(existente);
        expect(bloqueada).toEqual(existente);
        expect(desativada).toEqual(existente);
        expect(email.enviar).toHaveBeenCalledOnce();
    });

    it("segundo pedido em menos de 5 minutos: mesma resposta, mas nada novo é criado nem enviado", async () => {
        modelos.LinkDeSeguranca.findOne.mockResolvedValue({ id: "l1" });

        const r = await Servico.solicitar("ana@exemplo.com", CONTEXTO);

        expect(r.mensagem).toContain("Se existe uma conta");
        expect(modelos.LinkDeSeguranca.create).not.toHaveBeenCalled();
        expect(email.enviar).not.toHaveBeenCalled();
    });

    it("falha no envio não vaza: a resposta continua genérica e o erro vai só para o log, sem o endereço", async () => {
        email.enviar.mockRejectedValue(new Error("brevo fora do ar"));
        const erro = vi.spyOn(console, "error").mockImplementation(() => {});

        const r = await Servico.solicitar("ana@exemplo.com", CONTEXTO);

        expect(r.mensagem).toContain("Se existe uma conta");
        expect(erro.mock.calls[0][0]).not.toContain("ana@exemplo.com");

        erro.mockRestore();
    });
});

describe("confirmar (pelo link)", () => {
    const linkValido = (extra = {}) => ({
        usuarioId: "u1",
        tipo: "comprometida",
        utilizadoEm: null,
        expiraEm: new Date(Date.now() + 30 * 60 * 1000),
        update: vi.fn(),
        ...extra
    });

    beforeEach(() => {
        modelos.LinkDeSeguranca.findOne.mockResolvedValue(linkValido());
        modelos.Usuario.findByPk.mockResolvedValue(usuario);
    });

    it("protege: invalida os access tokens, encerra TODAS as sessões e a confiança nos dispositivos, e registra o evento", async () => {
        const r = await Servico.confirmar("token-valido-token-valido-token", CONTEXTO);

        expect(modelos.Usuario.update).toHaveBeenCalledWith({ senhaAlteradaEm: expect.any(Date) }, { where: { id: "u1" }, transaction: transacao });
        expect(sessoes.revogarTodos).toHaveBeenCalledWith("u1", { transaction: transacao });
        expect(dispositivos.revogarTodos).toHaveBeenCalledWith("u1", { transaction: transacao });
        expect(eventos.registrar).toHaveBeenCalledWith("u1", "conta_protegida_por_link", CONTEXTO, { origem: "comprometida" }, { transaction: transacao });
        expect(transacao.commit).toHaveBeenCalled();
        expect(r.proximoPasso).toBe("redefinir-senha");
    });

    it("procura o link pelo HASH do token, trancando a linha", async () => {
        await Servico.confirmar("token-valido-token-valido-token", CONTEXTO);

        const opcoes = modelos.LinkDeSeguranca.findOne.mock.calls[0][0];

        expect(opcoes.where.tokenHash).toBe(hashToken("token-valido-token-valido-token"));
        expect(opcoes.lock).toBe("UPDATE");
    });

    it("o link vale uma vez: marca o uso; usado, vencido, inexistente ou lixo é recusado SEM encerrar nada", async () => {
        const link = linkValido();
        modelos.LinkDeSeguranca.findOne.mockResolvedValue(link);
        await Servico.confirmar("token-valido-token-valido-token", CONTEXTO);
        expect(link.update).toHaveBeenCalledWith({ utilizadoEm: expect.any(Date) }, { transaction: transacao });

        vi.clearAllMocks();
        transacao.finished = false;

        for (const ruim of [linkValido({ utilizadoEm: new Date() }), linkValido({ expiraEm: new Date(Date.now() - 1000) }), null]) {
            modelos.LinkDeSeguranca.findOne.mockResolvedValue(ruim);
            transacao.finished = false;

            await expect(Servico.confirmar("token-qualquer-token-qualquer", CONTEXTO)).rejects.toMatchObject({
                detalhes: { codigo: "LINK_DE_SEGURANCA_INVALIDO" }
            });
        }

        for (const lixo of [undefined, "", 42, "x".repeat(201)]) {
            await expect(Servico.confirmar(lixo, CONTEXTO)).rejects.toMatchObject({ detalhes: { codigo: "LINK_DE_SEGURANCA_INVALIDO" } });
        }

        expect(sessoes.revogarTodos).not.toHaveBeenCalled();
        expect(dispositivos.revogarTodos).not.toHaveBeenCalled();
        expect(modelos.Usuario.update).not.toHaveBeenCalled();
    });

    it("NUNCA desliga a verificação em duas etapas: não toca nas tabelas do TOTP", async () => {
        await Servico.confirmar("token-valido-token-valido-token", CONTEXTO);

        expect(modelos.AutenticacaoTotp.destroy).not.toHaveBeenCalled();
        expect(modelos.CodigoRecuperacaoTotp.destroy).not.toHaveBeenCalled();
    });

    it("depois de proteger: avisa por e-mail e manda o link de nova senha; uma falha de e-mail não desfaz a proteção", async () => {
        email.enviar.mockRejectedValue(new Error("fora do ar"));
        recuperacao.solicitar.mockRejectedValue(new Error("fora do ar"));
        const erro = vi.spyOn(console, "error").mockImplementation(() => {});

        const r = await Servico.confirmar("token-valido-token-valido-token", CONTEXTO);

        expect(r.proximoPasso).toBe("redefinir-senha");
        expect(transacao.commit).toHaveBeenCalled();
        expect(recuperacao.solicitar).toHaveBeenCalledWith("ana@exemplo.com", CONTEXTO);

        erro.mockRestore();
    });

    it("erro no meio da transação desfaz tudo", async () => {
        sessoes.revogarTodos.mockRejectedValue(new Error("banco caiu"));

        await expect(Servico.confirmar("token-valido-token-valido-token", CONTEXTO)).rejects.toThrow("banco caiu");
        expect(transacao.rollback).toHaveBeenCalled();
        expect(transacao.commit).not.toHaveBeenCalled();
        expect(email.enviar).not.toHaveBeenCalled();
    });
});

describe("protegerAgora (logado)", () => {
    const comSenha = (hash) => modelos.Usuario.scope.mockReturnValue({ findByPk: vi.fn().mockResolvedValue({ id: "u1", senhaHash: hash }) });

    it("conta com senha: exige a senha atual; errada ou ausente é 401 e nada é encerrado", async () => {
        comSenha("hash");
        bcrypt.compararSenha.mockResolvedValue(false);

        await expect(Servico.protegerAgora(usuario, { senhaAtual: "errada" }, {}, CONTEXTO)).rejects.toMatchObject({ statusCode: 401 });
        await expect(Servico.protegerAgora(usuario, {}, {}, CONTEXTO)).rejects.toMatchObject({ statusCode: 401 });

        expect(sessoes.revogarTodosExceto).not.toHaveBeenCalled();
        expect(dispositivos.revogarTodos).not.toHaveBeenCalled();
    });

    it("senha certa: encerra as OUTRAS sessões (preserva a atual), remove a confiança, registra e avisa", async () => {
        comSenha("hash");
        bcrypt.compararSenha.mockResolvedValue(true);

        const r = await Servico.protegerAgora(usuario, { senhaAtual: "certa" }, { familiaId: "f1", tokenAtual: "rt" }, CONTEXTO);

        expect(sessoes.revogarTodosExceto).toHaveBeenCalledWith("u1", { familiaId: "f1", tokenAtual: "rt" });
        expect(dispositivos.revogarTodos).toHaveBeenCalledWith("u1");
        expect(eventos.registrar).toHaveBeenCalledWith("u1", "conta_protegida_agora", CONTEXTO);
        expect(email.enviar).toHaveBeenCalledOnce();
        expect(r.proximoPasso).toBe("trocar-senha");
    });

    it("conta sem senha (só Google): não pede senha", async () => {
        comSenha(null);

        await expect(Servico.protegerAgora(usuario, {}, { familiaId: "f1" }, CONTEXTO)).resolves.toMatchObject({ proximoPasso: "trocar-senha" });
        expect(bcrypt.compararSenha).not.toHaveBeenCalled();
    });

    it("não derruba as sessões da conta em outra transação (usa revogarTodosExceto, nunca revogarTodos)", async () => {
        comSenha(null);

        await Servico.protegerAgora(usuario, {}, { familiaId: "f1" }, CONTEXTO);

        expect(sessoes.revogarTodos).not.toHaveBeenCalled();
    });
});
