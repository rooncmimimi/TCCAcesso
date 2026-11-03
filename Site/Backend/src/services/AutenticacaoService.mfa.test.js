import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/**
 * Login com verificação em duas etapas: a senha (ou o Google) sozinha não abre sessão para quem tem TOTP,
 * o desafio só serve para o passo 2, e a sessão sai marcada como verificada. O banco é simulado; o que
 * só um banco de verdade prova é conferido na rodada funcional descrita em
 * `Site/docs/verificacao-em-duas-etapas.md`.
 */

const SEGREDO = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

vi.mock("../config/env.js", () => ({
    default: { jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres", expiresIn: "30m" } }
}));

const { totp, auditoria, sessoes } = vi.hoisted(() => ({
    totp: {
        habilitado: vi.fn(() => true),
        exigirHabilitado: vi.fn(),
        buscarAtivo: vi.fn(),
        conferirSegundoFator: vi.fn(),
        codigosRestantes: vi.fn(),
        situacaoDaConta: vi.fn()
    },
    auditoria: { registrar: vi.fn() },
    sessoes: { emitir: vi.fn(), revogarTodos: vi.fn() }
}));

vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn() } }));
vi.mock("../models/index.js", () => ({
    Usuario: { findOne: vi.fn(), findByPk: vi.fn(), create: vi.fn(), scope: vi.fn() },
    Candidato: { findOne: vi.fn(), create: vi.fn() },
    Empresa: { findOne: vi.fn(), create: vi.fn() },
    CodigoVerificacaoEmail: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() }
}));
vi.mock("../utils/bcrypt.js", () => ({ gerarHashSenha: vi.fn(), compararSenha: vi.fn() }));
vi.mock("./TotpService.js", () => ({ default: totp }));
vi.mock("./AdminAuditoriaService.js", () => ({ default: auditoria }));
vi.mock("./SessaoService.js", () => ({ default: sessoes }));
vi.mock("./EmailService.js", () => ({ default: { disponivel: vi.fn(() => false), enviar: vi.fn() } }));
vi.mock("./NotificacaoService.js", () => ({ default: { criar: vi.fn() } }));
vi.mock("./NotificacaoPushService.js", () => ({ default: { removerTodosDoUsuario: vi.fn() } }));
vi.mock("./AdminUsuarioService.js", () => ({ default: { excluirContaDefinitivamente: vi.fn() } }));
vi.mock("../utils/modelosEmail.js", () => ({
    modeloConfirmacaoCadastro: vi.fn(),
    modeloConfirmacaoTrocaEmail: vi.fn(),
    modeloSenhaAlterada: vi.fn()
}));
vi.mock("../utils/urlFrontend.js", () => ({ montarUrlFrontend: vi.fn(() => "https://site.exemplo/x") }));

const { Usuario, Candidato, Empresa } = await import("../models/index.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");
const { verificarJwt } = await import("../utils/jwt.js");

const conta = (extra = {}) => ({
    id: "u1",
    tipoUsuario: "candidato",
    ativo: true,
    bloqueado: false,
    emailVerificado: true,
    pausadoPeloUsuario: false,
    cadastroConcluidoEm: new Date(),
    senhaHash: "hash",
    save: vi.fn(),
    toJSON() {
        return { id: this.id, tipoUsuario: this.tipoUsuario };
    },
    ...extra
});

const SEM_MFA = { mfaDisponivel: false, mfaConfigurado: false, mfaExigido: false };

beforeEach(() => {
    vi.resetAllMocks();
    totp.habilitado.mockReturnValue(true);
    totp.buscarAtivo.mockResolvedValue(null);
    totp.situacaoDaConta.mockResolvedValue(SEM_MFA);
    sessoes.emitir.mockResolvedValue({ refreshToken: "refresh-de-teste" });
    Candidato.findOne.mockResolvedValue({ pais: "BR", dataNascimento: "1990-01-01", cidade: "SP", estado: "SP", cpfHash: "h" });
    Empresa.findOne.mockResolvedValue(null);
});

describe("entrarComUsuario com TOTP ativo", () => {
    it("não emite sessão nem token: devolve o desafio", async () => {
        totp.buscarAtivo.mockResolvedValue({ usuarioId: "u1" });

        const r = await AutenticacaoService.entrarComUsuario(conta(), { ip: "1.1.1.1" });

        expect(r.mfaNecessario).toBe(true);
        expect(r.metodosMfa).toEqual(["totp", "recuperacao"]);
        expect(r.token).toBeUndefined();
        expect(r.refreshToken).toBeUndefined();
        expect(sessoes.emitir).not.toHaveBeenCalled();
    });

    it("o desafio vale 5 minutos e leva só a conta (sub), nunca um id de sessão", async () => {
        totp.buscarAtivo.mockResolvedValue({ usuarioId: "u1" });

        const { desafioMfa } = await AutenticacaoService.entrarComUsuario(conta(), {});
        const carga = jwt.decode(desafioMfa);

        expect(carga.sub).toBe("u1");
        expect(carga.id).toBeUndefined();
        expect(carga.aud).toBe("acesso:mfa-desafio");
        expect(carga.exp - carga.iat).toBe(300);
    });

    it("o desafio NÃO abre uma sessão: o servidor o recusa como access token", async () => {
        totp.buscarAtivo.mockResolvedValue({ usuarioId: "u1" });

        const { desafioMfa } = await AutenticacaoService.entrarComUsuario(conta(), {});

        expect(() => verificarJwt(desafioMfa)).toThrow();
    });

    it("um access token comum NÃO serve de desafio", async () => {
        const { token } = await AutenticacaoService.entrarComUsuario(conta(), {});

        await expect(AutenticacaoService.concluirLoginComSegundoFator(token, "123456")).rejects.toMatchObject({
            detalhes: { codigo: "MFA_DESAFIO_EXPIRADO" }
        });
    });

    it("conta pausada com TOTP também passa pelo desafio antes de qualquer revelação", async () => {
        totp.buscarAtivo.mockResolvedValue({ usuarioId: "u1" });

        const r = await AutenticacaoService.entrarComUsuario(conta({ pausadoPeloUsuario: true }), {});

        expect(r.mfaNecessario).toBe(true);
        expect(r.contaPausada).toBeUndefined();
    });

    it("conta bloqueada ou desativada continua recusada antes do desafio", async () => {
        totp.buscarAtivo.mockResolvedValue({ usuarioId: "u1" });

        await expect(AutenticacaoService.entrarComUsuario(conta({ bloqueado: true }), {})).rejects.toMatchObject({ statusCode: 403 });
        await expect(AutenticacaoService.entrarComUsuario(conta({ ativo: false }), {})).rejects.toMatchObject({ statusCode: 403 });
    });

    it("com o recurso desligado, o login é o de sempre e o banco do TOTP nem é consultado", async () => {
        totp.habilitado.mockReturnValue(false);

        const r = await AutenticacaoService.entrarComUsuario(conta(), {});

        expect(r.token).toBeDefined();
        expect(totp.buscarAtivo).not.toHaveBeenCalled();
    });

    it("conta sem TOTP entra direto, sem a marca de verificação", async () => {
        const r = await AutenticacaoService.entrarComUsuario(conta(), {});

        expect(r.mfaNecessario).toBeUndefined();
        expect(verificarJwt(r.token).mfa).toBeUndefined();
        expect(sessoes.emitir).toHaveBeenCalledWith("u1", {}, { mfaVerificadoEm: null });
    });
});

describe("administrador que ainda não configurou o TOTP", () => {
    it("entra, mas a resposta diz que a configuração está pendente e o token não leva a marca", async () => {
        totp.situacaoDaConta.mockResolvedValue({ mfaDisponivel: true, mfaConfigurado: false, mfaExigido: true });

        const r = await AutenticacaoService.entrarComUsuario(conta({ tipoUsuario: "administrador" }), {});

        expect(r.mfaConfiguracaoPendente).toBe(true);
        expect(r.usuario).toMatchObject({ mfaExigido: true, mfaConfigurado: false });
        expect(verificarJwt(r.token).mfa).toBeUndefined();
    });

    it("quem tem o TOTP já configurado não aparece como pendente", async () => {
        totp.situacaoDaConta.mockResolvedValue({ mfaDisponivel: true, mfaConfigurado: true, mfaExigido: true });

        const r = await AutenticacaoService.entrarComUsuario(conta({ tipoUsuario: "administrador" }), {}, false, { segundoFatorVerificado: true });

        expect(r.mfaConfiguracaoPendente).toBe(false);
    });
});

describe("concluirLoginComSegundoFator", () => {
    const desafio = (extra = {}) =>
        jwt.sign({ sub: "u1", cr: 0, ...extra }, SEGREDO, { expiresIn: "5m", issuer: "acesso-api", audience: "acesso:mfa-desafio" });

    beforeEach(() => {
        Usuario.findByPk.mockResolvedValue(conta());
    });

    it("com o código certo emite a sessão marcada como verificada (token com mfa e refresh com mfaVerificadoEm)", async () => {
        totp.conferirSegundoFator.mockResolvedValue({ ok: true, metodo: "totp" });

        const r = await AutenticacaoService.concluirLoginComSegundoFator(desafio(), "123456", { ip: "1.1.1.1" });

        expect(totp.conferirSegundoFator).toHaveBeenCalledWith("u1", "123456");
        expect(r.token).toBeDefined();
        expect(verificarJwt(r.token).mfa).toBeGreaterThan(0);
        expect(sessoes.emitir).toHaveBeenCalledWith("u1", { ip: "1.1.1.1" }, { mfaVerificadoEm: expect.any(Date) });
        expect(r.codigosRecuperacaoRestantes).toBeUndefined();
    });

    it("código errado: 400 e nenhuma sessão", async () => {
        totp.conferirSegundoFator.mockResolvedValue({ ok: false, metodo: null });

        await expect(AutenticacaoService.concluirLoginComSegundoFator(desafio(), "000000")).rejects.toMatchObject({
            statusCode: 400,
            detalhes: { codigo: "MFA_CODIGO_INVALIDO" }
        });
        expect(sessoes.emitir).not.toHaveBeenCalled();
    });

    it("a espera por erros seguidos (429) sobe como está", async () => {
        totp.conferirSegundoFator.mockRejectedValue(Object.assign(new Error("espere"), { statusCode: 429 }));

        await expect(AutenticacaoService.concluirLoginComSegundoFator(desafio(), "000000")).rejects.toMatchObject({ statusCode: 429 });
        expect(sessoes.emitir).not.toHaveBeenCalled();
    });

    it.each([
        ["desafio vencido", () => jwt.sign({ sub: "u1" }, SEGREDO, { expiresIn: -10, issuer: "acesso-api", audience: "acesso:mfa-desafio" })],
        ["assinado com outro segredo", () => jwt.sign({ sub: "u1" }, "outro-segredo-outro-segredo-outro-segredo", { issuer: "acesso-api", audience: "acesso:mfa-desafio" })],
        ["sem audience", () => jwt.sign({ sub: "u1" }, SEGREDO, { issuer: "acesso-api" })],
        ["lixo", () => "isto-nao-e-um-jwt-isto-nao-e-um-jwt"]
    ])("%s é recusado, sem consultar a conta nem o código", async (_nome, fabricar) => {
        await expect(AutenticacaoService.concluirLoginComSegundoFator(fabricar(), "123456")).rejects.toMatchObject({
            detalhes: { codigo: "MFA_DESAFIO_EXPIRADO" }
        });
        expect(totp.conferirSegundoFator).not.toHaveBeenCalled();
    });

    it("conta que deixou de existir depois do desafio: tratado como desafio vencido", async () => {
        Usuario.findByPk.mockResolvedValue(null);

        await expect(AutenticacaoService.concluirLoginComSegundoFator(desafio(), "123456")).rejects.toMatchObject({
            detalhes: { codigo: "MFA_DESAFIO_EXPIRADO" }
        });
    });

    it("conta bloqueada depois do desafio não recebe sessão, mesmo com o código certo", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ bloqueado: true }));
        totp.conferirSegundoFator.mockResolvedValue({ ok: true, metodo: "totp" });

        await expect(AutenticacaoService.concluirLoginComSegundoFator(desafio(), "123456")).rejects.toMatchObject({ statusCode: 403 });
        expect(sessoes.emitir).not.toHaveBeenCalled();
    });

    it("entrar com código de recuperação vai para a auditoria e a resposta diz quantos restam", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ tipoUsuario: "administrador" }));
        totp.conferirSegundoFator.mockResolvedValue({ ok: true, metodo: "recuperacao" });
        totp.codigosRestantes.mockResolvedValue(7);

        const r = await AutenticacaoService.concluirLoginComSegundoFator(desafio(), "ABCDE-FGHJK", { ip: "2.2.2.2" });

        expect(r.codigosRecuperacaoRestantes).toBe(7);
        expect(auditoria.registrar).toHaveBeenCalledWith(
            expect.objectContaining({
                administradorId: "u1",
                acao: "totp_codigo_recuperacao_usado",
                entidadeId: "u1",
                metadados: { codigosRestantes: 7 },
                ip: "2.2.2.2"
            })
        );
        expect(JSON.stringify(auditoria.registrar.mock.calls)).not.toContain("ABCDE");
    });

    it("o login com o app (não recuperação) não gera registro de auditoria", async () => {
        totp.conferirSegundoFator.mockResolvedValue({ ok: true, metodo: "totp" });

        await AutenticacaoService.concluirLoginComSegundoFator(desafio(), "123456");

        expect(auditoria.registrar).not.toHaveBeenCalled();
    });

    it("a confirmação de reativação feita no passo 1 vale no passo 2", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ pausadoPeloUsuario: true }));
        totp.conferirSegundoFator.mockResolvedValue({ ok: true, metodo: "totp" });

        const r = await AutenticacaoService.concluirLoginComSegundoFator(desafio({ cr: 1 }), "123456");

        expect(r.token).toBeDefined();
        expect(r.contaPausada).toBeUndefined();
    });

    it("sem a confirmação de reativação, a conta pausada pede a confirmação (e o código já foi gasto)", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ pausadoPeloUsuario: true }));
        totp.conferirSegundoFator.mockResolvedValue({ ok: true, metodo: "totp" });

        const r = await AutenticacaoService.concluirLoginComSegundoFator(desafio({ cr: 0 }), "123456");

        expect(r.contaPausada).toBe(true);
        expect(r.token).toBeUndefined();
    });
});

describe("renovar a sessão mantém a verificação", () => {
    it("o access token novo leva a marca quando a sessão tinha passado pelo segundo fator", async () => {
        const momento = new Date("2026-11-01T12:00:00Z");
        sessoes.rotacionar = vi.fn(async () => ({ usuario: conta(), refreshToken: "novo", mfaVerificadoEm: momento }));

        const r = await AutenticacaoService.renovarToken("refresh-antigo", {});

        expect(verificarJwt(r.token).mfa).toBe(Math.floor(momento.getTime() / 1000));
    });

    it("sessão que nunca passou pelo segundo fator continua sem a marca depois de renovar", async () => {
        sessoes.rotacionar = vi.fn(async () => ({ usuario: conta(), refreshToken: "novo", mfaVerificadoEm: null }));

        const r = await AutenticacaoService.renovarToken("refresh-antigo", {});

        expect(verificarJwt(r.token).mfa).toBeUndefined();
    });
});

describe("emitirSessaoVerificada (depois de ativar o TOTP)", () => {
    it("emite refresh e token com a marca da ativação", async () => {
        const momento = new Date("2026-11-01T12:00:00Z");

        const r = await AutenticacaoService.emitirSessaoVerificada(conta(), { ip: "3.3.3.3" }, momento);

        expect(sessoes.emitir).toHaveBeenCalledWith("u1", { ip: "3.3.3.3" }, { mfaVerificadoEm: momento });
        expect(verificarJwt(r.token).mfa).toBe(Math.floor(momento.getTime() / 1000));
        expect(r.refreshToken).toBe("refresh-de-teste");
    });
});
