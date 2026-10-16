import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/**
 * `GoogleAuthController` com o serviço do Google e o de autenticação simulados: o que se testa aqui
 * é o desenho do fluxo (para onde o `callback` redireciona, o que `concluir` responde em cada
 * desfecho, quando o código é gasto), não a conversa com o Google, que `GoogleAuthService.test.js`
 * cobre. `jsonwebtoken`, o registro de uso único e `utils/codigoGoogle.js` ficam reais, para o
 * código de entrega ser assinado, amarrado ao navegador e consumido de verdade.
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
const { assinarCodigoDeEntrega, assinarProva, hashDoVinculo, lerProva } = await import("../utils/codigoGoogle.js");
const { codigosDeEntregaUsados } = await import("../utils/usoUnico.js");

const PERFIL = { sub: "sub-1", email: "ana@exemplo.com", emailVerificado: true, nome: "Ana" };

// O segredo fica no `sessionStorage` do navegador; o servidor só conhece o hash dele.
const SEGREDO_DO_NAVEGADOR = "segredo-aleatorio-do-navegador-com-256-bits";
const VINCULO = hashDoVinculo(SEGREDO_DO_NAVEGADOR);

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

const codigoDeEntrega = ({ perfil = PERFIL, tipoConta = null, vinculo = VINCULO } = {}) =>
    assinarCodigoDeEntrega({ perfil, tipoConta, vinculo });

/** O corpo que o Site manda: o código e o segredo do navegador que começou o fluxo. */
const corpo = (extra = {}) => ({ codigo: codigoDeEntrega(), vinculo: SEGREDO_DO_NAVEGADOR, ...extra });

/** Chama `concluir` e devolve `{ res, next }` para as conferências. */
const concluir = async (body) => {
    const res = resposta();
    const next = vi.fn();
    await GoogleAuthController.concluir(requisicao({ body }), res, next);
    return { res, next };
};

const erroDe = ({ next }) => next.mock.calls[0]?.[0];

beforeEach(() => {
    // reset (e não só clear): respostas `...Once` que sobrarem de um teste não vazam para o próximo.
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    GoogleAuthService.lerState.mockReturnValue({ nonce: "n1", tipoConta: null, vinculo: VINCULO, origem: "https://site.exemplo" });
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
    it("monta a URL com o tipoConta pedido, o vínculo do navegador e a origem de quem chamou", async () => {
        GoogleAuthService.gerarUrlDeAutorizacao.mockReturnValue({ url: "https://accounts.google.com/x", state: "s" });
        const req = requisicao({ query: { tipoConta: "empresa", vinculo: VINCULO }, get: vi.fn(() => "https://site.exemplo") });
        const res = resposta();

        await GoogleAuthController.iniciar(req, res, vi.fn());

        expect(GoogleAuthService.gerarUrlDeAutorizacao).toHaveBeenCalledWith({
            tipoConta: "empresa",
            vinculo: VINCULO,
            origem: "https://site.exemplo"
        });
        expect(res.json).toHaveBeenCalledWith({ sucesso: true, url: "https://accounts.google.com/x" });
    });

    it("não devolve o state ao navegador, só a URL", async () => {
        GoogleAuthService.gerarUrlDeAutorizacao.mockReturnValue({ url: "u", state: "segredo-do-state" });
        const res = resposta();
        await GoogleAuthController.iniciar(requisicao({ query: { vinculo: VINCULO } }), res, vi.fn());
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

    it("no sucesso, devolve o código de entrega no fragmento da URL, e não na query (achado 13)", async () => {
        GoogleAuthService.lerState.mockReturnValue({ nonce: "n1", tipoConta: "empresa", vinculo: VINCULO, origem: "https://site.exemplo" });
        GoogleAuthService.perfilDoCodigo.mockResolvedValue(PERFIL);
        const res = resposta();

        await GoogleAuthController.callback(requisicao({ query: { code: "c", state: "s" } }), res);

        expect(GoogleAuthService.perfilDoCodigo).toHaveBeenCalledWith("c", "n1");
        const destino = new URL(res.redirect.mock.calls[0][0]);
        expect(destino.origin + destino.pathname).toBe("https://site.exemplo/retorno-google");
        expect(destino.search).toBe("");
        expect(destino.hash).toMatch(/^#codigo=[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it("o código de entrega carrega o perfil, o vínculo com o navegador e dura 2 minutos (achado 3)", async () => {
        GoogleAuthService.lerState.mockReturnValue({ nonce: "n1", tipoConta: "empresa", vinculo: VINCULO, origem: "https://site.exemplo" });
        GoogleAuthService.perfilDoCodigo.mockResolvedValue(PERFIL);
        const res = resposta();

        await GoogleAuthController.callback(requisicao({ query: { code: "c", state: "s" } }), res);

        const codigo = new URL(res.redirect.mock.calls[0][0]).hash.slice("#codigo=".length);
        const conteudo = jwt.verify(codigo, SEGREDO, { audience: "acesso:google:entrega" });
        expect(conteudo.perfil).toEqual(PERFIL);
        expect(conteudo.tipoConta).toBe("empresa");
        expect(conteudo.vinculo).toBe(VINCULO);
        expect(conteudo.jti).toEqual(expect.any(String));
        expect(conteudo.exp - conteudo.iat).toBe(120);
    });

    it("cada retorno gera um código diferente, com identificador próprio", async () => {
        GoogleAuthService.perfilDoCodigo.mockResolvedValue(PERFIL);
        const codigos = [];
        for (let i = 0; i < 2; i += 1) {
            const res = resposta();
            await GoogleAuthController.callback(requisicao({ query: { code: "c", state: "s" } }), res);
            codigos.push(new URL(res.redirect.mock.calls[0][0]).hash);
        }
        expect(codigos[0]).not.toBe(codigos[1]);
    });
});

describe("concluir", () => {
    it("recusa código inválido com 400", async () => {
        const { next } = await concluir(corpo({ codigo: "abc.def.ghi" }));
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
    });

    it("recusa código expirado com 400", async () => {
        const expirado = jwt.sign({ perfil: PERFIL, vinculo: VINCULO }, SEGREDO, {
            expiresIn: -10,
            audience: "acesso:google:entrega",
            jwtid: "x"
        });
        const { next } = await concluir(corpo({ codigo: expirado }));
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
    });

    it("recusa um JWT que não é código de entrega (access token, sem audience)", async () => {
        const acesso = jwt.sign({ id: "u1", tipoUsuario: "candidato" }, SEGREDO, { expiresIn: 60 });
        const { next } = await concluir(corpo({ codigo: acesso }));
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
    });

    it("recusa a prova do Google apresentada no lugar do código de entrega", async () => {
        const { next } = await concluir(corpo({ codigo: assinarProva(PERFIL) }));
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
        expect(GoogleAuthService.resolver).not.toHaveBeenCalled();
    });

    it("entrar: cria a sessão passando IP e navegador e devolve tokens", async () => {
        const usuario = { id: "u1" };
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });

        const { res } = await concluir(corpo());

        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledWith(usuario, { ip: "10.0.0.1", userAgent: "navegador-de-teste" }, false);
        expect(res.json).toHaveBeenCalledWith({ sucesso: true, desfecho: "entrar", usuario: { id: "u1" }, token: "t", refreshToken: "r" });
    });

    it("entrar: reativa a conta pausada quando o Site reenvia o código com confirmarReativacao", async () => {
        const usuario = { id: "u1" };
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });

        await concluir(corpo({ confirmarReativacao: true }));

        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledWith(usuario, expect.any(Object), true);
    });

    it("entrar: sem confirmarReativacao, a conta pausada não é reativada", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ contaPausada: true });

        await concluir(corpo());

        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledWith({ id: "u1" }, expect.any(Object), false);
    });

    it("entrar: repassa a resposta de conta pausada (o Site precisa tratá-la)", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ contaPausada: true });

        const { res } = await concluir(corpo());

        expect(res.json).toHaveBeenCalledWith({ sucesso: true, desfecho: "entrar", contaPausada: true });
    });

    it("entrar: entrega ao middleware o 403 de conta bloqueada", async () => {
        const bloqueio = Object.assign(new Error("Conta bloqueada"), { statusCode: 403 });
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockRejectedValue(bloqueio);

        const { next } = await concluir(corpo());

        expect(next).toHaveBeenCalledWith(bloqueio);
    });

    it("conflito: responde 200 com o e-mail e não cria sessão", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });

        const { res } = await concluir(corpo());

        expect(res.json).toHaveBeenCalledWith({ sucesso: true, desfecho: "conflito", email: "ana@exemplo.com" });
        expect(AutenticacaoService.entrarComUsuario).not.toHaveBeenCalled();
    });

    it("cadastrar: devolve só e-mail e nome (nunca o sub) e a prova do Google, e não o código", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "cadastrar", perfil: PERFIL });
        const codigo = codigoDeEntrega({ tipoConta: "empresa" });

        const { res } = await concluir(corpo({ codigo }));

        const resultado = res.json.mock.calls[0][0];
        expect(resultado).toEqual({
            sucesso: true,
            desfecho: "cadastrar",
            tipoConta: "empresa",
            perfil: { email: "ana@exemplo.com", nome: "Ana" },
            prova: expect.any(String)
        });
        expect(JSON.stringify(resultado.perfil)).not.toContain("sub-1");
        expect(resultado.prova).not.toBe(codigo);
    });

    it("cadastrar: a prova é assinada pelo servidor, carrega o perfil verificado e dura 15 minutos", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "cadastrar", perfil: PERFIL });

        const { res } = await concluir(corpo());

        const { perfil, exp, iat } = lerProva(res.json.mock.calls[0][0].prova);
        expect(perfil).toEqual(PERFIL);
        expect(exp - iat).toBe(15 * 60);
    });

    it("cadastrar: recusa já aqui, com 400, um e-mail que o Google não verificou", async () => {
        const naoVerificado = { ...PERFIL, emailVerificado: false };
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "cadastrar", perfil: naoVerificado });

        const outcome = await concluir(corpo({ codigo: codigoDeEntrega({ perfil: naoVerificado }) }));

        expect(erroDe(outcome)).toMatchObject({ statusCode: 400, message: expect.stringContaining("Google não confirmou") });
        expect(outcome.res.json).not.toHaveBeenCalled();
    });

    it("conflito: continua aparecendo mesmo quando o Google não verificou o e-mail", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });

        const { res } = await concluir(corpo({ codigo: codigoDeEntrega({ perfil: { ...PERFIL, emailVerificado: false } }) }));

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ desfecho: "conflito" }));
    });
});

// Achado 3 da auditoria: o código sozinho não autentica ninguém. Só funciona no navegador que
// começou o fluxo e uma única vez.
describe("concluir — vínculo com o navegador (achado 3)", () => {
    beforeEach(() => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "entrar", usuario: { id: "u1" } });
        AutenticacaoService.entrarComUsuario.mockResolvedValue({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });
    });

    it.each([[undefined], [null], [""], ["segredo-de-outro-navegador"], [VINCULO]])(
        "recusa com 400 o segredo %j: quem recebeu o endereço de outra pessoa não consegue entrar na conta dela",
        async (segredo) => {
            const outcome = await concluir(corpo({ vinculo: segredo }));

            expect(erroDe(outcome)).toMatchObject({ statusCode: 400, message: expect.stringContaining("não começou neste navegador") });
            expect(GoogleAuthService.resolver).not.toHaveBeenCalled();
            expect(AutenticacaoService.entrarComUsuario).not.toHaveBeenCalled();
            expect(outcome.res.json).not.toHaveBeenCalled();
        }
    );

    it("recusa um código que não tem vínculo gravado (emitido por uma versão antiga)", async () => {
        const semVinculo = jwt.sign({ perfil: PERFIL }, SEGREDO, { expiresIn: 60, audience: "acesso:google:entrega", jwtid: "x" });
        const { next } = await concluir(corpo({ codigo: semVinculo }));
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
    });

    it("um navegador alheio que tenta o código não o gasta: o dono ainda consegue entrar", async () => {
        const codigo = codigoDeEntrega();

        const atacante = await concluir({ codigo, vinculo: "segredo-do-atacante" });
        expect(erroDe(atacante)).toMatchObject({ statusCode: 400 });

        const dono = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(dono.next).not.toHaveBeenCalled();
        expect(dono.res.json).toHaveBeenCalledWith(expect.objectContaining({ desfecho: "entrar", token: "t" }));
    });

    it("recusa o segundo uso do mesmo código de entrega", async () => {
        const codigo = codigoDeEntrega();

        const primeiro = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(primeiro.next).not.toHaveBeenCalled();

        const segundo = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(erroDe(segundo)).toMatchObject({ statusCode: 400, message: expect.stringContaining("já foi usado") });
        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledTimes(1);
    });

    it("duas apresentações simultâneas do mesmo código: só uma abre sessão", async () => {
        const codigo = codigoDeEntrega();

        const resultados = await Promise.all([
            concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR }),
            concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR })
        ]);

        expect(AutenticacaoService.entrarComUsuario).toHaveBeenCalledTimes(1);
        expect(resultados.filter((r) => r.next.mock.calls.length === 0)).toHaveLength(1);
    });

    it("códigos diferentes não se atrapalham", async () => {
        const a = await concluir(corpo());
        const b = await concluir(corpo());
        expect(a.next).not.toHaveBeenCalled();
        expect(b.next).not.toHaveBeenCalled();
    });

    it("o conflito também gasta o código", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
        const codigo = codigoDeEntrega();
        await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });

        const outro = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(erroDe(outro)).toMatchObject({ statusCode: 400 });
    });

    // A conta pausada e o e-mail não verificado não chegam a cumprir o papel do código: a pessoa
    // ainda vai decidir (reativar) ou provar o e-mail. O Site reenvia o mesmo código.
    it("conta pausada não gasta o código: reativar reapresenta o mesmo código", async () => {
        AutenticacaoService.entrarComUsuario
            .mockResolvedValueOnce({ contaPausada: true })
            .mockResolvedValueOnce({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });
        const codigo = codigoDeEntrega();

        const pausada = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(pausada.res.json).toHaveBeenCalledWith({ sucesso: true, desfecho: "entrar", contaPausada: true });

        const reativada = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR, confirmarReativacao: true });
        expect(reativada.next).not.toHaveBeenCalled();
        expect(reativada.res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "t" }));
    });

    it("depois da reativação, o código está gasto", async () => {
        AutenticacaoService.entrarComUsuario
            .mockResolvedValueOnce({ contaPausada: true })
            .mockResolvedValue({ usuario: { id: "u1" }, token: "t", refreshToken: "r" });
        const corpoDaReativacao = { codigo: codigoDeEntrega(), vinculo: SEGREDO_DO_NAVEGADOR };

        await concluir(corpoDaReativacao);
        await concluir({ ...corpoDaReativacao, confirmarReativacao: true });
        const denovo = await concluir({ ...corpoDaReativacao, confirmarReativacao: true });

        expect(erroDe(denovo)).toMatchObject({ statusCode: 400, message: expect.stringContaining("já foi usado") });
    });

    it("e-mail não verificado (empresa) não gasta o código", async () => {
        AutenticacaoService.entrarComUsuario.mockResolvedValueOnce({ emailNaoVerificado: true, email: "rh@empresa.com" });
        const codigo = codigoDeEntrega();

        await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        const reaproveitado = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });

        expect(reaproveitado.next).not.toHaveBeenCalled();
    });

    it("um erro no meio do caminho (por exemplo, o banco fora do ar) não gasta o código", async () => {
        AutenticacaoService.entrarComUsuario.mockRejectedValueOnce(new Error("banco fora do ar"));
        const codigo = codigoDeEntrega();

        const falhou = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(erroDe(falhou)).toMatchObject({ message: "banco fora do ar" });

        const tentativa = await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(tentativa.next).not.toHaveBeenCalled();
    });

    it("não deixa lixo no registro depois de liberar", async () => {
        const antes = codigosDeEntregaUsados.tamanho;
        AutenticacaoService.entrarComUsuario.mockResolvedValueOnce({ contaPausada: true });

        await concluir(corpo());

        expect(codigosDeEntregaUsados.tamanho).toBe(antes);
    });
});

describe("vincular", () => {
    const vincular = async (body, usuario = { id: "u1" }) => {
        const res = resposta();
        const next = vi.fn();
        await GoogleAuthController.vincular(requisicao({ body, user: usuario }), res, next);
        return { res, next };
    };

    it("vincula o sub do código à conta da sessão, nunca a outra", async () => {
        AutenticacaoService.perfilAtual.mockResolvedValue({ id: "u1" });

        const { res } = await vincular(corpo());

        expect(GoogleAuthService.vincular).toHaveBeenCalledWith("u1", PERFIL);
        expect(res.json).toHaveBeenCalledWith({ sucesso: true, usuario: { id: "u1" } });
    });

    it("recusa código inválido com 400, sem tocar na conta", async () => {
        const { next } = await vincular(corpo({ codigo: "lixo" }));
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
        expect(GoogleAuthService.vincular).not.toHaveBeenCalled();
    });

    it("recusa o segredo de outro navegador, sem tocar na conta (achado 3)", async () => {
        const { next } = await vincular(corpo({ vinculo: "segredo-de-outro-navegador" }));
        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
        expect(GoogleAuthService.vincular).not.toHaveBeenCalled();
    });

    it("recusa o segundo uso do mesmo código", async () => {
        AutenticacaoService.perfilAtual.mockResolvedValue({ id: "u1" });
        const codigo = codigoDeEntrega();

        await vincular({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        const { next } = await vincular({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });

        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400, message: expect.stringContaining("já foi usado") });
        expect(GoogleAuthService.vincular).toHaveBeenCalledTimes(1);
    });

    it("um código gasto em `concluir` não serve em `vincular`, e vice-versa", async () => {
        GoogleAuthService.resolver.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
        AutenticacaoService.perfilAtual.mockResolvedValue({ id: "u1" });
        const codigo = codigoDeEntrega();

        await concluir({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        const { next } = await vincular({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });

        expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
        expect(GoogleAuthService.vincular).not.toHaveBeenCalled();
    });

    it("um erro ao vincular (ex.: sub já em outra conta) não gasta o código", async () => {
        GoogleAuthService.vincular.mockRejectedValueOnce(Object.assign(new Error("já vinculado"), { statusCode: 409 }));
        AutenticacaoService.perfilAtual.mockResolvedValue({ id: "u1" });
        const codigo = codigoDeEntrega();

        const falhou = await vincular({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(falhou.next.mock.calls[0][0]).toMatchObject({ statusCode: 409 });

        const tentativa = await vincular({ codigo, vinculo: SEGREDO_DO_NAVEGADOR });
        expect(tentativa.next).not.toHaveBeenCalled();
    });
});
