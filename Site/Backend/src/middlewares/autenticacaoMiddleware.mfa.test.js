import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * O que o middleware faz com a regra do TOTP: administrador sem TOTP configurado ou sem a sessão verificada
 * é recusado no servidor (403 com `codigo`), e o middleware opcional não o trata como administrador.
 */

const { payload, usuarios, totp } = vi.hoisted(() => ({
    payload: { atual: { id: "u1", iat: 1000 } },
    usuarios: { atual: null },
    totp: { estadoDoAcesso: vi.fn() }
}));

vi.mock("../utils/jwt.js", () => ({
    verificarJwt: vi.fn(() => payload.atual),
    tokenAnteriorATrocaDeSenha: vi.fn(() => false)
}));
vi.mock("../models/index.js", () => ({ Usuario: { findByPk: vi.fn(async () => usuarios.atual) } }));
vi.mock("../services/TotpService.js", () => ({ default: totp }));

const { default: autenticacaoMiddleware, autenticacaoSemExigirMfa } = await import("./autenticacaoMiddleware.js");
const { default: autenticacaoOpcional } = await import("./autenticacaoOpcionalMiddleware.js");

const requisicao = () => ({ headers: { authorization: "Bearer token-qualquer" } });

async function rodar(middleware) {
    const req = requisicao();
    const next = vi.fn();
    await middleware(req, {}, next);

    return { req, next, erro: next.mock.calls[0]?.[0] };
}

beforeEach(() => {
    vi.clearAllMocks();
    usuarios.atual = { id: "u1", tipoUsuario: "administrador", ativo: true, bloqueado: false };
    totp.estadoDoAcesso.mockResolvedValue("ok");
});

describe("autenticacaoMiddleware (padrão de toda rota)", () => {
    it("estado ok: segue e preenche req.user", async () => {
        const { req, erro } = await rodar(autenticacaoMiddleware);

        expect(erro).toBeUndefined();
        expect(req.user.id).toBe("u1");
        expect(req.mfaEstado).toBe("ok");
    });

    it("administrador sem TOTP: 403 MFA_NAO_CONFIGURADO, e req.user não é preenchido", async () => {
        totp.estadoDoAcesso.mockResolvedValue("nao_configurado");

        const { req, erro } = await rodar(autenticacaoMiddleware);

        expect(erro).toMatchObject({ statusCode: 403, detalhes: { codigo: "MFA_NAO_CONFIGURADO" } });
        expect(req.user).toBeUndefined();
    });

    it("administrador com sessão não verificada: 403 MFA_NECESSARIO", async () => {
        totp.estadoDoAcesso.mockResolvedValue("necessario");

        const { erro } = await rodar(autenticacaoMiddleware);

        expect(erro).toMatchObject({ statusCode: 403, detalhes: { codigo: "MFA_NECESSARIO" } });
    });

    it("entrega o payload do token ao serviço, que compara a marca com a data da ativação", async () => {
        await rodar(autenticacaoMiddleware);

        expect(totp.estadoDoAcesso).toHaveBeenCalledWith(usuarios.atual, payload.atual);
    });

    it("bloqueio e conta desativada continuam vindo antes, sem consultar o TOTP", async () => {
        usuarios.atual = { id: "u1", tipoUsuario: "administrador", ativo: true, bloqueado: true };

        const { erro } = await rodar(autenticacaoMiddleware);

        expect(erro.detalhes.codigo).toBe("CONTA_BLOQUEADA");
        expect(totp.estadoDoAcesso).not.toHaveBeenCalled();
    });
});

describe("autenticacaoSemExigirMfa (só /me, /logout e a configuração)", () => {
    it.each(["nao_configurado", "necessario"])("deixa passar no estado %s e informa em req.mfaEstado", async (estado) => {
        totp.estadoDoAcesso.mockResolvedValue(estado);

        const { req, erro } = await rodar(autenticacaoSemExigirMfa);

        expect(erro).toBeUndefined();
        expect(req.user.id).toBe("u1");
        expect(req.mfaEstado).toBe(estado);
    });

    it("mas token inválido ou conta bloqueada continuam recusados", async () => {
        usuarios.atual = { id: "u1", tipoUsuario: "administrador", ativo: true, bloqueado: true };

        const { erro } = await rodar(autenticacaoSemExigirMfa);

        expect(erro.statusCode).toBe(403);
    });
});

describe("autenticacaoOpcionalMiddleware (rotas públicas)", () => {
    it("estado ok: reconhece a pessoa", async () => {
        const { req } = await rodar(autenticacaoOpcional);

        expect(req.user?.id).toBe("u1");
    });

    it.each(["nao_configurado", "necessario"])("administrador no estado %s segue como visitante, sem poder de administrador", async (estado) => {
        totp.estadoDoAcesso.mockResolvedValue(estado);

        const { req, erro } = await rodar(autenticacaoOpcional);

        expect(erro).toBeUndefined();
        expect(req.user).toBeUndefined();
    });
});
