import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Encerrar uma sessão vale na hora: o access token leva `sid` (o login), e o middleware confere que o login segue
 * ativo. Token sem `sid` (emitido antes da migration 0009) vale até expirar. Sem a chave ligada, o banco nem é consultado.
 */

const { env, payload, usuarios, sessoes, totp } = vi.hoisted(() => ({
    env: { sessoes: { dispositivosHabilitado: true } },
    payload: { atual: { id: "u1", iat: 1000, sid: "f1" } },
    usuarios: { atual: null },
    sessoes: { familiaViva: vi.fn() },
    totp: { estadoDoAcesso: vi.fn() }
}));

vi.mock("../config/env.js", () => ({ default: env }));
vi.mock("../utils/jwt.js", () => ({ verificarJwt: vi.fn(() => payload.atual), tokenAnteriorATrocaDeSenha: vi.fn(() => false) }));
vi.mock("../models/index.js", () => ({ Usuario: { findByPk: vi.fn(async () => usuarios.atual) } }));
vi.mock("../services/TotpService.js", () => ({ default: totp }));
vi.mock("../services/SessaoService.js", () => ({ default: sessoes }));

const { default: autenticacao } = await import("./autenticacaoMiddleware.js");
const { default: opcional } = await import("./autenticacaoOpcionalMiddleware.js");

async function rodar(middleware) {
    const req = { headers: { authorization: "Bearer qualquer" } };
    const next = vi.fn();
    await middleware(req, {}, next);

    return { req, erro: next.mock.calls[0]?.[0] };
}

beforeEach(() => {
    vi.clearAllMocks();
    env.sessoes.dispositivosHabilitado = true;
    payload.atual = { id: "u1", iat: 1000, sid: "f1" };
    usuarios.atual = { id: "u1", tipoUsuario: "candidato", ativo: true, bloqueado: false };
    sessoes.familiaViva.mockResolvedValue(true);
    totp.estadoDoAcesso.mockResolvedValue("ok");
});

describe("autenticacaoMiddleware com sessões e dispositivos", () => {
    it("login ativo: segue e guarda a família em req.sessaoFamiliaId", async () => {
        const { req, erro } = await rodar(autenticacao);

        expect(erro).toBeUndefined();
        expect(req.sessaoFamiliaId).toBe("f1");
        expect(sessoes.familiaViva).toHaveBeenCalledWith("u1", "f1");
    });

    it("login encerrado: 401 SESSAO_ENCERRADA, e req.user não é preenchido", async () => {
        sessoes.familiaViva.mockResolvedValue(false);

        const { req, erro } = await rodar(autenticacao);

        expect(erro).toMatchObject({ statusCode: 401, detalhes: { codigo: "SESSAO_ENCERRADA" } });
        expect(req.user).toBeUndefined();
    });

    it("a conferência da sessão vem antes de qualquer outra regra (inclusive do TOTP)", async () => {
        sessoes.familiaViva.mockResolvedValue(false);

        await rodar(autenticacao);

        expect(totp.estadoDoAcesso).not.toHaveBeenCalled();
    });

    it("token antigo, sem sid: vale até expirar (transição), sem consultar sessão", async () => {
        payload.atual = { id: "u1", iat: 1000 };

        const { req, erro } = await rodar(autenticacao);

        expect(erro).toBeUndefined();
        expect(req.sessaoFamiliaId).toBeUndefined();
        expect(sessoes.familiaViva).not.toHaveBeenCalled();
    });

    it("chave DESLIGADA: o sid é ignorado e o banco de sessões nem é consultado", async () => {
        env.sessoes.dispositivosHabilitado = false;
        sessoes.familiaViva.mockResolvedValue(false);

        const { erro } = await rodar(autenticacao);

        expect(erro).toBeUndefined();
        expect(sessoes.familiaViva).not.toHaveBeenCalled();
    });

    it("usuário bloqueado continua sendo recusado antes de tudo", async () => {
        usuarios.atual = { id: "u1", ativo: true, bloqueado: true };

        const { erro } = await rodar(autenticacao);

        expect(erro.detalhes.codigo).toBe("CONTA_BLOQUEADA");
        expect(sessoes.familiaViva).not.toHaveBeenCalled();
    });
});

describe("autenticacaoOpcionalMiddleware (rotas públicas)", () => {
    it("login ativo: reconhece a pessoa", async () => {
        const { req } = await rodar(opcional);

        expect(req.user?.id).toBe("u1");
    });

    it("login encerrado: segue como visitante, sem erro", async () => {
        sessoes.familiaViva.mockResolvedValue(false);

        const { req, erro } = await rodar(opcional);

        expect(erro).toBeUndefined();
        expect(req.user).toBeUndefined();
    });

    it("token antigo (sem sid): reconhece, como sempre", async () => {
        payload.atual = { id: "u1", iat: 1000 };

        const { req } = await rodar(opcional);

        expect(req.user?.id).toBe("u1");
        expect(sessoes.familiaViva).not.toHaveBeenCalled();
    });
});
