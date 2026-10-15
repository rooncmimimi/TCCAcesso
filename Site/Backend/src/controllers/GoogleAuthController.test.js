import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/**
 * `GoogleAuthController` com o serviço do Google e o de autenticação simulados: o que se testa aqui
 * é o desenho do fluxo (para onde o `callback` redireciona, o que `concluir` responde em cada
 * desfecho), não a conversa com o Google, que `GoogleAuthService.test.js` cobre. `jsonwebtoken`
 * fica real, para o código de entrega ser assinado e lido de verdade.
 */

const SEGREDO = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

const { env } = vi.hoisted(() => ({
    env: {
        jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres" },
        frontendUrl: "https://site.exemplo"
    }
}));

vi.mock("../config/env.js", () => ({ default: env }));

vi.mock("../services/GoogleAuthService.js", () => ({
    default: {
        disponivel: vi.fn(),
        gerarUrlDeAutorizacao: vi.fn(),
        lerState: vi.fn(),
        perfilDoCodigo: vi.fn(),
        resolver: vi.fn(),
        vincular: vi.fn()
    }
}));

vi.mock("../services/AutenticacaoService.js", () => ({
    default: { entrarComUsuario: vi.fn(), perfilAtual: vi.fn() }
}));

const { default: GoogleAuthService } = await import("../services/GoogleAuthService.js");
const { default: AutenticacaoService } = await import("../services/AutenticacaoService.js");
const { default: GoogleAuthController } = await import("./GoogleAuthController.js");

const PERFIL = { sub: "sub-1", email: "ana@exemplo.com", emailVerificado: true, nome: "Ana" };

const resposta = () => {
    const res = { status: vi.fn(), json: vi.fn(), redirect: vi.fn() };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res;
};

const requisicao = (extra = {}) => ({
    query: {},
    body: {},
    headers: { "user-agent": "navegador-de-teste" },
    ip: "10.0.0.1",
    get: vi.fn(() => undefined),
    ...extra
});

const codigoDeEntrega = (conteudo = { perfil: PERFIL, tipoConta: null }, opcoes = { expiresIn: 900 }) =>
    jwt.sign(conteudo, SEGREDO, opcoes);

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    GoogleAuthService.lerState.mockReturnValue({ nonce: "n1", tipoConta: null, origem: "https://site.exemplo" });
});

describe("disponivel", () => {
    it("repete ao Site se o recurso está configurado", () => {
        GoogleAuthService.disponivel.mockReturnValue(true);
        const res = resposta();
        GoogleAuthController.disponivel(requisicao(), res);
        expect(res.json).toHaveBeenCalledWith({ sucesso: true, disponivel: true });
    });
});

describe("iniciar", () => {
    it("monta a URL com o tipoConta pedido e a origem de quem chamou", async () => {
        GoogleAuthService.gerarUrlDeAutorizacao.mockReturnValue({ url: "https://accounts.google.com/x", state: "s" });
        const req = requisicao({ query: { tipoConta: "empresa" }, get: vi.fn(() => "https://site.exemplo") });
        const res = resposta();

        await GoogleAuthController.iniciar(req, res, vi.fn());

        expect(GoogleAuthService.gerarUrlDeAutorizacao).toHaveBeenCalledWith({ tipoConta: "empresa", origem: "https://site.exemplo" });
        expect(res.json).toHaveBeenCalledWith({ sucesso: true, url: "https://accounts.google.com/x" });
    });

    it("não devolve o state ao navegador, só a URL", async () => {
        GoogleAuthService.gerarUrlDeAutorizacao.mockReturnValue({ url: "u", state: "segredo-do-state" });
        const res = resposta();
        await GoogleAuthController.iniciar(requisicao(), res, vi.fn());
        expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("segredo-do-state");
    });

    it("entrega o erro ao middleware quando o serviço recusa", async () => {
        const erro = new Error("tipo inválido");
        GoogleAuthService.gerarUrlDeAutorizacao.mockImplementation(() => {
            throw erro;
        });
        const next = vi.fn();
        await GoogleAuthController.iniciar(requisicao(), resposta(), next);
        expect(next).toHaveBeenCalledWith(erro);
    });
});

describe("callback", () => {
    it("redireciona como cancelado quando o Google devolve error", async () => {
        const res = resposta();
        await GoogleAuthController.callback(requisicao({ query: { error: "access_denied", state: "s" } }), res);
        expect(res.redirect).toHaveBeenCalledWith("https://site.exemplo/retorno-google?erro=cancelado");
    });

    it("volta à origem gravada no state, inclusive ao cancelar", async () => {
        GoogleAuthService.lerState.mockReturnValue({ nonce: "n1", origem: "http://localhost:5173" });
        const res = resposta();
        await GoogleAuthController.callback(requisicao({ query: { error: "access_denied", state: "s" } }), res);
        expect(res.redirect).toHaveBeenCalledWith("http://localhost:5173/retorno-google?erro=cancelado");
    });

    it("cai na origem padrão quando o state é inválido", async () => {
        GoogleAuthService.lerState.mockImplementation(() => {
            throw new Error("state inválido");
        });
        const res = resposta();
        await GoogleAuthController.callback(requisicao({ query: { error: "access_denied", state: "x" } }), res);
        expect(res.redirect).toHaveBeenCalledWith("https://site.exemplo/retorno-google?erro=cancelado");
    });

    it("redireciona com erro=falha e registra o motivo no log quando a validação falha", async () => {
        GoogleAuthService.perfilDoCodigo.mockRejectedValue(new Error("nonce não confere"));
        const res = resposta();
        await GoogleAuthController.callback(requisicao({ query: { code: "c", state: "s" } }), res);
        expect(res.redirect).toHaveBeenCalledWith("https://site.exemplo/retorno-google?erro=falha");
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("nonce não confere"));
    });

    it("nunca coloca o motivo do erro na URL", async () => {
        GoogleAuthService.perfilDoCodigo.mockRejectedValue(new Error("motivo-interno-secreto"));
        const res = resposta();
        await GoogleAuthController.callback(requisicao({ query: { code: "c", state: "s" } }), res);
        expect(res.redirect.mock.calls[0][0]).not.toContain("motivo-interno-secreto");
    });

    it("no sucesso, redireciona com um código de entrega assinado que carrega o perfil e dura 15 minutos", async () => {
        GoogleAuthService.lerState.mockReturnValue({ nonce: "n1", tipoConta: "empresa", origem: "https://site.exemplo" });
        GoogleAuthService.perfilDoCodigo.mockResolvedValue(PERFIL);
        const res = resposta();

        await GoogleAuthController.callback(requisicao({ query: { code: "c", state: "s" } }), res);

        expect(GoogleAuthService.perfilDoCodigo).toHaveBeenCalledWith("c", "n1");
        const destino = new URL(res.redirect.mock.calls[0][0]);
        expect(destino.origin + destino.pathname).toBe("https://site.exemplo/retorno-google");
        const conteudo = jwt.verify(destino.searchParams.get("codigo"), SEGREDO);
        expect(conteudo.perfil).toEqual(PERFIL);
        expect(conteudo.tipoConta).toBe("empresa");
        expect(conteudo.exp - conteudo.iat).toBe(15 * 60);
    });
});

describe("concluir", () => {
    it("recusa código inválido com 400", async () => {
        const next = vi.fn();
        await GoogleAuthController.concluir(requisicao({ body: { codigo: "abc.def.ghi" } }), resposta(), next);
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
    });

    it("recusa código expirado com 400", async () => {
        const next = vi.fn();
        const codigo = codigoDeEntrega({ perfil: PERFIL }, { expiresIn: -10 });
        await GoogleAuthController.concluir(requisicao({ body: { codigo } }), resposta(), next);
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
    });

    it("recusa um JWT que não é código de entrega (sem perfil.sub)", async () => {
        const next = vi.fn();
        const acesso = jwt.sign({ id: "u1", tipoUsuario: "candidato" }, SEGREDO, { expiresIn: 60 });
        await GoogleAuthController.concluir(requisicao({ body: { codigo: acesso } }), resposta(), next);
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
    });

    it("entrar: cria a sessão passando IP e navegador e devolve tokens", async () => {
        const usuario = { id: "u1" };
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });
        const res = resposta();

        await GoogleAuthController.concluir(requisicao({ body: { codigo: codigoDeEntrega() } }), res, vi.fn());

        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledWith(usuario, { ip: "10.0.0.1", userAgent: "navegador-de-teste" }, false);
        expect(res.json).toHaveBeenCalledWith({ sucesso: true, desfecho: "entrar", usuario: { id: "u1" }, token: "t", refreshToken: "r" });
    });

    it("entrar: reativa a conta pausada quando o Site reenvia o código com confirmarReativacao", async () => {
        const usuario = { id: "u1" };
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });

        await GoogleAuthController.concluir(
            requisicao({ body: { codigo: codigoDeEntrega(), confirmarReativacao: true } }),
            resposta(),
            vi.fn()
        );

        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledWith(usuario, expect.any(Object), true);
    });

    it("entrar: sem confirmarReativacao, a conta pausada não é reativada", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ contaPausada: true });

        await GoogleAuthController.concluir(requisicao({ body: { codigo: codigoDeEntrega() } }), resposta(), vi.fn());

        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledWith({ id: "u1" }, expect.any(Object), false);
    });

    it("entrar: repassa a resposta de conta pausada (o Site precisa tratá-la)", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ contaPausada: true });
        const res = resposta();

        await GoogleAuthController.concluir(requisicao({ body: { codigo: codigoDeEntrega() } }), res, vi.fn());

        expect(res.json).toHaveBeenCalledWith({ sucesso: true, desfecho: "entrar", contaPausada: true });
    });

    it("entrar: entrega ao middleware o 403 de conta bloqueada", async () => {
        const bloqueio = Object.assign(new Error("Conta bloqueada"), { statusCode: 403 });
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockRejectedValue(bloqueio);
        const next = vi.fn();

        await GoogleAuthController.concluir(requisicao({ body: { codigo: codigoDeEntrega() } }), resposta(), next);

        expect(next).toHaveBeenCalledWith(bloqueio);
    });

    it("conflito: responde 200 com o e-mail e não cria sessão", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
        const res = resposta();

        await GoogleAuthController.concluir(requisicao({ body: { codigo: codigoDeEntrega() } }), res, vi.fn());

        expect(res.json).toHaveBeenCalledWith({ sucesso: true, desfecho: "conflito", email: "ana@exemplo.com" });
        expect(AutenticacaoService.entrarComUsuario).not.toHaveBeenCalled();
    });

    it("cadastrar: devolve só e-mail e nome (nunca o sub), o tipoConta e o próprio código", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "cadastrar", perfil: PERFIL });
        const codigo = codigoDeEntrega({ perfil: PERFIL, tipoConta: "empresa" });
        const res = resposta();

        await GoogleAuthController.concluir(requisicao({ body: { codigo } }), res, vi.fn());

        const corpo = res.json.mock.calls[0][0];
        expect(corpo).toEqual({
            sucesso: true,
            desfecho: "cadastrar",
            tipoConta: "empresa",
            perfil: { email: "ana@exemplo.com", nome: "Ana" },
            codigo
        });
        expect(JSON.stringify(corpo.perfil)).not.toContain("sub-1");
    });

    it("cadastrar: recusa já aqui, com 400, um e-mail que o Google não verificou", async () => {
        const naoVerificado = { ...PERFIL, emailVerificado: false };
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "cadastrar", perfil: naoVerificado });
        const res = resposta();
        const next = vi.fn();

        await GoogleAuthController.concluir(requisicao({ body: { codigo: codigoDeEntrega({ perfil: naoVerificado, tipoConta: null }) } }), res, next);

        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400, message: expect.stringContaining("Google não confirmou") });
        expect(res.json).not.toHaveBeenCalled();
    });

    it("conflito: continua aparecendo mesmo quando o Google não verificou o e-mail", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
        const res = resposta();

        await GoogleAuthController.concluir(
            requisicao({ body: { codigo: codigoDeEntrega({ perfil: { ...PERFIL, emailVerificado: false }, tipoConta: null }) } }),
            res,
            vi.fn()
        );

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ desfecho: "conflito" }));
    });

    // Achado 3 da auditoria: o código de entrega é um JWT sem estado e vale 15 minutos, então o
    // mesmo código abre uma sessão de novo a cada apresentação. A etapa 4 do plano o torna de uso
    // único, e este teste passa a ser um teste comum.
    it.fails("recusa o segundo uso do mesmo código de entrega (achado 3)", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });
        const codigo = codigoDeEntrega();

        await GoogleAuthController.concluir(requisicao({ body: { codigo } }), resposta(), vi.fn());
        const next = vi.fn();
        await GoogleAuthController.concluir(requisicao({ body: { codigo } }), resposta(), next);

        expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 400 });
    });
});

describe("vincular", () => {
    it("vincula o sub do código à conta da sessão, nunca a outra", async () => {
        AutenticacaoService.perfilAtual.mockResolvedValue({ id: "u1" });
        const res = resposta();

        await GoogleAuthController.vincular(
            requisicao({ body: { codigo: codigoDeEntrega() }, user: { id: "u1" } }),
            res,
            vi.fn()
        );

        expect(GoogleAuthService.vincular).toHaveBeenCalledWith("u1", PERFIL);
        expect(res.json).toHaveBeenCalledWith({ sucesso: true, usuario: { id: "u1" } });
    });

    it("recusa código inválido com 400, sem tocar na conta", async () => {
        const next = vi.fn();
        await GoogleAuthController.vincular(requisicao({ body: { codigo: "lixo" }, user: { id: "u1" } }), resposta(), next);
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
        expect(GoogleAuthService.vincular).not.toHaveBeenCalled();
    });
});
