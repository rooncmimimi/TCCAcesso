import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/**
 * `GoogleAuthService` sem rede e sem banco: `google-auth-library` e os modelos são simulados, e a
 * configuração (`env`) é um objeto mutável para cada teste poder ligar ou desligar o recurso.
 * `jsonwebtoken` e `ErroApi` ficam reais de propósito: os testes conferem `state` assinado de
 * verdade e os códigos de status que o `erroMiddleware` devolveria.
 */

const SEGREDO = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

const { env, clienteGoogle } = vi.hoisted(() => ({
    env: {
        google: { clientId: "id-de-teste.apps.googleusercontent.com", clientSecret: "segredo-do-cliente", redirectUri: "http://localhost:3000/api/auth/google/callback" },
        jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres" },
        security: { corsOrigins: ["http://localhost:5173", "https://site.exemplo"] },
        frontendUrl: "https://site.exemplo"
    },
    clienteGoogle: {
        generateAuthUrl: vi.fn(),
        getToken: vi.fn(),
        verifyIdToken: vi.fn()
    }
}));

vi.mock("../config/env.js", () => ({ default: env }));

vi.mock("google-auth-library", () => ({
    OAuth2Client: vi.fn(function OAuth2Client() {
        return clienteGoogle;
    })
}));

const { comSenha } = vi.hoisted(() => ({ comSenha: { findByPk: vi.fn() } }));

vi.mock("../models/index.js", () => ({
    Usuario: { findOne: vi.fn(), findByPk: vi.fn(), scope: vi.fn(() => comSenha) }
}));

vi.mock("./EmailService.js", () => ({ default: { disponivel: vi.fn(), enviar: vi.fn() } }));
vi.mock("./NotificacaoService.js", () => ({ default: { criar: vi.fn() } }));

const { Usuario } = await import("../models/index.js");
const { default: EmailService } = await import("./EmailService.js");
const { default: NotificacaoService } = await import("./NotificacaoService.js");
const { default: GoogleAuthService } = await import("./GoogleAuthService.js");

const CONFIG_PADRAO = { ...env.google };

// O hash (SHA-256 em base64url, 43 caracteres) do segredo que o Site guarda no navegador.
const VINCULO = "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0";
const gerar = (extra = {}) => GoogleAuthService.gerarUrlDeAutorizacao({ vinculo: VINCULO, ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    Usuario.scope.mockReturnValue(comSenha);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    env.google = { ...CONFIG_PADRAO };
    clienteGoogle.generateAuthUrl.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?x=1");
});

const statusDe = (fn) => {
    try {
        fn();
    } catch (erro) {
        return erro.statusCode;
    }
    return null;
};

describe("disponivel", () => {
    it("é verdadeiro quando as três variáveis do Google estão preenchidas", () => {
        expect(GoogleAuthService.disponivel()).toBe(true);
    });

    it.each(["clientId", "clientSecret", "redirectUri"])("é falso quando falta %s", (chave) => {
        env.google[chave] = null;
        expect(GoogleAuthService.disponivel()).toBe(false);
    });

    it("recusa gerar a URL com 503 quando o recurso não está configurado", () => {
        env.google.clientSecret = null;
        expect(statusDe(() => gerar())).toBe(503);
    });
});

describe("gerarUrlDeAutorizacao", () => {
    it("pede só openid, email e profile, com seleção de conta e sem escopos já concedidos", () => {
        gerar();

        const pedido = clienteGoogle.generateAuthUrl.mock.calls[0][0];
        expect(pedido.scope).toEqual(["openid", "email", "profile"]);
        expect(pedido.prompt).toBe("select_account");
        expect(pedido.include_granted_scopes).toBe(false);
        expect(pedido).not.toHaveProperty("access_type");
    });

    it("assina o state por 10 minutos e usa o mesmo nonce no state e no pedido ao Google", () => {
        const { state } = gerar({ tipoConta: "empresa", origem: "http://localhost:5173" });

        const conteudo = jwt.verify(state, SEGREDO);
        expect(conteudo.tipoConta).toBe("empresa");
        expect(conteudo.origem).toBe("http://localhost:5173");
        expect(conteudo.exp - conteudo.iat).toBe(600);
        expect(conteudo.nonce).toMatch(/^[0-9a-f]{32}$/);
        expect(clienteGoogle.generateAuthUrl.mock.calls[0][0].nonce).toBe(conteudo.nonce);
    });

    it("gera um nonce novo a cada pedido", () => {
        const a = jwt.decode(gerar().state).nonce;
        const b = jwt.decode(gerar().state).nonce;
        expect(a).not.toBe(b);
    });

    // Achado 3 da auditoria: o retorno só vale no navegador que clicou. O hash do segredo desse
    // navegador entra no state assinado e, daí, no código de entrega.
    it("grava no state o hash do segredo do navegador, para amarrar o retorno a ele (achado 3)", () => {
        const { state } = gerar();
        expect(jwt.verify(state, SEGREDO).vinculo).toBe(VINCULO);
    });

    it.each([[undefined], [null], [""], ["curto"], [`${VINCULO}x`], ["a".repeat(43) + "="]])(
        "recusa com 400 o vínculo %j: sem ele o retorno não poderia ser amarrado a um navegador",
        (vinculo) => {
            expect(statusDe(() => GoogleAuthService.gerarUrlDeAutorizacao({ vinculo }))).toBe(400);
            expect(clienteGoogle.generateAuthUrl).not.toHaveBeenCalled();
        }
    );

    it("recusa gerar a URL quando nenhum argumento é passado", () => {
        expect(statusDe(() => GoogleAuthService.gerarUrlDeAutorizacao())).toBe(400);
    });

    it("não grava intenção nem usuário no state de um login comum", () => {
        const conteudo = jwt.verify(gerar().state, SEGREDO);
        expect(conteudo).not.toHaveProperty("intencao");
        expect(conteudo).not.toHaveProperty("usuarioId");
    });

    // Etapa 5: vincular um Google a uma conta que já existe.
    it("grava a intenção de vincular e o id de quem pediu no state assinado", () => {
        const conteudo = jwt.verify(gerar({ intencao: "vincular", usuarioId: "u1" }).state, SEGREDO);
        expect(conteudo).toMatchObject({ intencao: "vincular", usuarioId: "u1", vinculo: VINCULO });
    });

    it.each([
        ["intenção sem usuário", { intencao: "vincular" }],
        ["usuário sem intenção", { usuarioId: "u1" }],
        ["intenção desconhecida", { intencao: "promover", usuarioId: "u1" }],
        ["usuário vazio", { intencao: "vincular", usuarioId: "" }]
    ])("recusa com 400 %s", (_nome, extra) => {
        expect(statusDe(() => gerar(extra))).toBe(400);
        expect(clienteGoogle.generateAuthUrl).not.toHaveBeenCalled();
    });

    it.each(["administrador", "candidato ", "EMPRESA", "x"])("recusa tipoConta %j com 400", (tipoConta) => {
        expect(statusDe(() => gerar({ tipoConta }))).toBe(400);
    });

    it.each([null, "candidato", "empresa"])("aceita tipoConta %j", (tipoConta) => {
        expect(() => gerar({ tipoConta })).not.toThrow();
    });
});

describe("origemDeRetorno", () => {
    it("aceita uma origem que está exatamente na lista do CORS", () => {
        expect(GoogleAuthService.origemDeRetorno("http://localhost:5173")).toBe("http://localhost:5173");
    });

    it.each([
        ["https://evil.example"],
        ["https://site.exemplo.evil.com"],
        ["https://site.exemplo/"],
        ["http://site.exemplo"],
        [""],
        [null]
    ])("cai na origem padrão para %j (nunca vira redirecionamento aberto)", (origem) => {
        expect(GoogleAuthService.origemDeRetorno(origem)).toBe("https://site.exemplo");
    });
});

describe("lerState", () => {
    // Cada teste de recusa muda só uma coisa: a validade e a `audience` entram por padrão.
    const assinar = (conteudo, opcoes = {}) =>
        jwt.sign(conteudo, SEGREDO, { expiresIn: "10m", audience: "acesso:google:state", ...opcoes });

    it("devolve o conteúdo de um state válido", () => {
        expect(GoogleAuthService.lerState(assinar({ nonce: "n1", tipoConta: null, vinculo: VINCULO }))).toMatchObject({
            nonce: "n1",
            vinculo: VINCULO
        });
    });

    it("recusa um state sem o vínculo com o navegador (achado 3)", () => {
        expect(statusDe(() => GoogleAuthService.lerState(assinar({ nonce: "n1", tipoConta: null })))).toBe(400);
    });

    it("devolve a intenção de vincular e o usuário quando o state os traz", () => {
        const conteudo = GoogleAuthService.lerState(assinar({ nonce: "n1", vinculo: VINCULO, intencao: "vincular", usuarioId: "u1" }));
        expect(conteudo).toMatchObject({ intencao: "vincular", usuarioId: "u1" });
    });

    it.each([
        ["intenção sem usuário", { intencao: "vincular" }],
        ["usuário sem intenção", { usuarioId: "u1" }],
        ["intenção desconhecida", { intencao: "promover", usuarioId: "u1" }]
    ])("recusa um state com %s", (_nome, extra) => {
        expect(statusDe(() => GoogleAuthService.lerState(assinar({ nonce: "n1", vinculo: VINCULO, ...extra })))).toBe(400);
    });

    // Achado 15: o state tem a sua audience, e os tokens de outros tipos não passam por ele.
    it("recusa um state sem audience, mesmo assinado com o segredo certo e com conteúdo válido", () => {
        const semAudience = jwt.sign({ nonce: "n1", vinculo: VINCULO }, SEGREDO, { expiresIn: "10m" });
        expect(statusDe(() => GoogleAuthService.lerState(semAudience))).toBe(400);
    });

    it.each([["acesso:google:entrega"], ["acesso:google:prova"], ["acesso:api"]])(
        "recusa um state com a audience de outro tipo de token (%s)",
        (audience) => {
            expect(statusDe(() => GoogleAuthService.lerState(assinar({ nonce: "n1", vinculo: VINCULO }, { audience })))).toBe(400);
        }
    );

    it("o state que o serviço gera tem a audience do state", () => {
        expect(jwt.decode(gerar().state).aud).toBe("acesso:google:state");
    });

    it("recusa um state com vínculo mal formado", () => {
        expect(statusDe(() => GoogleAuthService.lerState(assinar({ nonce: "n1", vinculo: "curto" })))).toBe(400);
    });

    it("recusa state ausente com 400", () => {
        expect(statusDe(() => GoogleAuthService.lerState(undefined))).toBe(400);
    });

    it("recusa state expirado com 400", () => {
        expect(statusDe(() => GoogleAuthService.lerState(assinar({ nonce: "n1", vinculo: VINCULO }, { expiresIn: -10 })))).toBe(400);
    });

    it("recusa state assinado com outro segredo", () => {
        const falso = jwt.sign({ nonce: "n1", vinculo: VINCULO }, "outro-segredo-qualquer-com-bastante-tamanho", {
            expiresIn: "10m",
            audience: "acesso:google:state"
        });
        expect(statusDe(() => GoogleAuthService.lerState(falso))).toBe(400);
    });

    it("recusa state adulterado", () => {
        const [cabecalho, , assinatura] = assinar({ nonce: "n1", vinculo: VINCULO }).split(".");
        const corpoTrocado = Buffer.from(JSON.stringify({ nonce: "n2", vinculo: VINCULO, exp: 9999999999 })).toString("base64url");
        expect(statusDe(() => GoogleAuthService.lerState(`${cabecalho}.${corpoTrocado}.${assinatura}`))).toBe(400);
    });

    it("recusa um JWT válido que não tem nonce (por exemplo, um access token)", () => {
        expect(statusDe(() => GoogleAuthService.lerState(assinar({ id: "u1", tipoUsuario: "candidato" })))).toBe(400);
    });
});

describe("perfilDoCodigo", () => {
    const idToken = (dados) => ({ getPayload: () => dados });

    beforeEach(() => {
        clienteGoogle.getToken.mockResolvedValue({ tokens: { id_token: "id-token-fake", access_token: "nao-deve-ser-usado" } });
        clienteGoogle.verifyIdToken.mockResolvedValue(
            idToken({ sub: "sub-1", email: "Ana.Silva@Gmail.com", email_verified: true, name: "Ana Silva", nonce: "n1" })
        );
    });

    it("devolve o perfil verificado, com e-mail em minúsculas", async () => {
        await expect(GoogleAuthService.perfilDoCodigo("codigo", "n1")).resolves.toEqual({
            sub: "sub-1",
            email: "ana.silva@gmail.com",
            emailVerificado: true,
            nome: "Ana Silva"
        });
    });

    it("confere o ID token contra o Client ID configurado", async () => {
        await GoogleAuthService.perfilDoCodigo("codigo", "n1");
        expect(clienteGoogle.verifyIdToken).toHaveBeenCalledWith({
            idToken: "id-token-fake",
            audience: env.google.clientId
        });
    });

    it("recusa quando o nonce do ID token não é o do state (token de outro pedido)", async () => {
        await expect(GoogleAuthService.perfilDoCodigo("codigo", "outro")).rejects.toMatchObject({ statusCode: 400 });
    });

    it("recusa sem código de autorização", async () => {
        await expect(GoogleAuthService.perfilDoCodigo("", "n1")).rejects.toMatchObject({ statusCode: 400 });
        expect(clienteGoogle.getToken).not.toHaveBeenCalled();
    });

    it("recusa com 400 e mensagem genérica quando o Google rejeita o código", async () => {
        clienteGoogle.getToken.mockRejectedValue(new Error("invalid_grant"));
        const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);
        expect(erro.statusCode).toBe(400);
        expect(erro.message).not.toMatch(/invalid_grant/);
    });

    // Achado 14: a pessoa vê uma mensagem genérica, mas o log do servidor guarda o que o Google disse.
    describe("a causa real da falha na troca do código", () => {
        const falhaDoGoogle = (resposta) => Object.assign(new Error("Request failed with status code 400"), { response: { data: resposta } });

        it("fica na falha, para o log do servidor: invalid_client é o segredo errado ou trocado", async () => {
            clienteGoogle.getToken.mockRejectedValue(
                falhaDoGoogle({ error: "invalid_client", error_description: "The OAuth client was not found." })
            );

            const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);

            expect(erro.motivoGoogle).toBe("invalid_client: The OAuth client was not found.");
        });

        it("distingue invalid_grant (código usado ou vencido)", async () => {
            clienteGoogle.getToken.mockRejectedValue(falhaDoGoogle({ error: "invalid_grant", error_description: "Bad Request" }));

            const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);

            expect(erro.motivoGoogle).toBe("invalid_grant: Bad Request");
        });

        it("sem resposta do Google, guarda o código de rede", async () => {
            clienteGoogle.getToken.mockRejectedValue(Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }));

            const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);

            expect(erro.motivoGoogle).toBe("ENOTFOUND");
        });

        it("sem nenhuma pista, guarda a mensagem do erro", async () => {
            clienteGoogle.getToken.mockRejectedValue(new Error("algo inesperado"));

            const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);

            expect(erro.motivoGoogle).toBe("algo inesperado");
        });

        it("a mensagem para a pessoa continua genérica, sem o motivo", async () => {
            clienteGoogle.getToken.mockRejectedValue(
                falhaDoGoogle({ error: "invalid_client", error_description: "The OAuth client was not found." })
            );

            const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);

            expect(erro.statusCode).toBe(400);
            expect(erro.message).not.toMatch(/invalid_client|OAuth/);
        });

        it("só lê o código e a descrição: nenhum outro campo da resposta entra no log", async () => {
            clienteGoogle.getToken.mockRejectedValue(
                falhaDoGoogle({ error: "invalid_grant", error_description: "Bad Request", id_token: "token-secreto", access_token: "outro-secreto" })
            );

            const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);

            expect(erro.motivoGoogle).not.toMatch(/secreto/);
        });

        it("limita o tamanho e junta quebras de linha", async () => {
            clienteGoogle.getToken.mockRejectedValue(falhaDoGoogle({ error: "invalid_request", error_description: "linha 1\nlinha 2 " + "x".repeat(500) }));

            const erro = await GoogleAuthService.perfilDoCodigo("codigo", "n1").catch((e) => e);

            expect(erro.motivoGoogle).not.toContain("\n");
            expect(erro.motivoGoogle.length).toBeLessThanOrEqual(200);
        });
    });

    it("recusa quando o Google não devolve ID token", async () => {
        clienteGoogle.getToken.mockResolvedValue({ tokens: { access_token: "so-access" } });
        await expect(GoogleAuthService.perfilDoCodigo("codigo", "n1")).rejects.toMatchObject({ statusCode: 400 });
    });

    it("recusa um ID token sem sub", async () => {
        clienteGoogle.verifyIdToken.mockResolvedValue(idToken({ email: "a@b.com", nonce: "n1" }));
        await expect(GoogleAuthService.perfilDoCodigo("codigo", "n1")).rejects.toMatchObject({ statusCode: 400 });
    });

    it("propaga a falha da verificação de assinatura, emissor ou validade", async () => {
        clienteGoogle.verifyIdToken.mockRejectedValue(new Error("Wrong recipient"));
        await expect(GoogleAuthService.perfilDoCodigo("codigo", "n1")).rejects.toThrow("Wrong recipient");
    });

    it.each([[undefined], [false], ["true"], [1]])(
        "só considera o e-mail verificado quando email_verified é exatamente true (recebeu %j)",
        async (valor) => {
            clienteGoogle.verifyIdToken.mockResolvedValue(
                idToken({ sub: "sub-1", email: "a@b.com", email_verified: valor, nonce: "n1" })
            );
            const perfil = await GoogleAuthService.perfilDoCodigo("codigo", "n1");
            expect(perfil.emailVerificado).toBe(false);
        }
    );
});

describe("resolver", () => {
    const perfil = { sub: "sub-1", email: "ana@exemplo.com", emailVerificado: true, nome: "Ana" };

    /** Simula a tabela `usuarios`: acha por `googleId` ou por `email`, exatamente como o `where` pede. */
    const bancoCom = (...usuarios) =>
        Usuario.findOne.mockImplementation(async ({ where }) =>
            usuarios.find((u) => (where.googleId ? u.googleId === where.googleId : u.email === where.email)) ?? null
        );

    it("devolve entrar quando já existe conta vinculada a este sub", async () => {
        const conta = { id: "u1", googleId: "sub-1", email: "outro@exemplo.com" };
        bancoCom(conta);
        await expect(GoogleAuthService.resolver(perfil)).resolves.toEqual({ desfecho: "entrar", usuario: conta });
    });

    it("prefere o vínculo pelo sub ao e-mail, mesmo que o e-mail da conta tenha mudado", async () => {
        bancoCom({ id: "u1", googleId: "sub-1", email: "novo@exemplo.com" }, { id: "u2", googleId: null, email: "ana@exemplo.com" });
        const resultado = await GoogleAuthService.resolver(perfil);
        expect(resultado.usuario.id).toBe("u1");
    });

    it("devolve conflito, sem vincular, quando só o e-mail coincide", async () => {
        bancoCom({ id: "u2", googleId: null, email: "ana@exemplo.com" });
        await expect(GoogleAuthService.resolver(perfil)).resolves.toEqual({ desfecho: "conflito", email: "ana@exemplo.com" });
    });

    it("devolve conflito mesmo quando o e-mail igual está em uma conta ligada a outro Google", async () => {
        bancoCom({ id: "u2", googleId: "sub-de-outro", email: "ana@exemplo.com" });
        const resultado = await GoogleAuthService.resolver(perfil);
        expect(resultado.desfecho).toBe("conflito");
    });

    it("devolve cadastrar quando não há conta nem por sub nem por e-mail", async () => {
        bancoCom();
        await expect(GoogleAuthService.resolver(perfil)).resolves.toEqual({ desfecho: "cadastrar", perfil });
    });

    it("devolve cadastrar quando o Google não informa e-mail e o sub é novo", async () => {
        bancoCom();
        const semEmail = { ...perfil, email: null };
        await expect(GoogleAuthService.resolver(semEmail)).resolves.toEqual({ desfecho: "cadastrar", perfil: semEmail });
        expect(Usuario.findOne).toHaveBeenCalledTimes(1);
    });

    // Achado 2 da auditoria: o cadastro grava o e-mail do Gmail sem pontos e sem "+etiqueta", e o
    // Google informa o endereço com os pontos. `resolver` procura pela forma canônica.
    it("reconhece como conflito o Gmail com ponto quando a conta foi gravada sem ponto (achado 2)", async () => {
        bancoCom({ id: "u2", googleId: null, email: "mariasilva@gmail.com" });
        const resultado = await GoogleAuthService.resolver({ ...perfil, email: "maria.silva@gmail.com" });
        expect(resultado.desfecho).toBe("conflito");
    });

    it("procura o e-mail do Google na forma canônica, e não no texto cru", async () => {
        bancoCom();
        await GoogleAuthService.resolver({ ...perfil, email: "Maria.Silva+acesso@Gmail.com" });
        expect(Usuario.findOne).toHaveBeenLastCalledWith({ where: { email: "mariasilva@gmail.com" } });
    });

    it("o conflito devolve o e-mail como o Google o informou, para a mensagem mostrar o que a pessoa conhece", async () => {
        bancoCom({ id: "u2", googleId: null, email: "mariasilva@gmail.com" });
        const resultado = await GoogleAuthService.resolver({ ...perfil, email: "maria.silva@gmail.com" });
        expect(resultado.email).toBe("maria.silva@gmail.com");
    });
});

const perfilGoogle = { sub: "sub-1", email: "ana@gmail.com", emailVerificado: true, nome: "Ana" };

/** Uma conta como o modelo a devolve, com `update` que grava os campos. */
const conta = (extra = {}) => {
    const usuario = { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato", googleId: null, ...extra };
    usuario.update = vi.fn(async (campos) => Object.assign(usuario, campos));
    return usuario;
};

describe("situacao", () => {
    it("diz se o recurso existe aqui, se a conta é elegível e se já tem Google", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ googleId: "sub-1" }));
        await expect(GoogleAuthService.situacao("u1")).resolves.toEqual({ disponivel: true, elegivel: true, vinculado: true });
    });

    it.each(["empresa", "administrador"])("conta de %s não é elegível", async (tipoUsuario) => {
        Usuario.findByPk.mockResolvedValue(conta({ tipoUsuario }));
        await expect(GoogleAuthService.situacao("u1")).resolves.toMatchObject({ elegivel: false, vinculado: false });
    });

    it("nunca devolve o sub, só se há vínculo", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ googleId: "sub-secreto" }));
        expect(JSON.stringify(await GoogleAuthService.situacao("u1"))).not.toContain("sub-secreto");
    });

    it("avisa quando o recurso não está configurado, sem recusar", async () => {
        env.google.clientSecret = null;
        Usuario.findByPk.mockResolvedValue(conta());
        await expect(GoogleAuthService.situacao("u1")).resolves.toMatchObject({ disponivel: false });
    });

    it("recusa com 404 o usuário que não existe", async () => {
        Usuario.findByPk.mockResolvedValue(null);
        await expect(GoogleAuthService.situacao("u1")).rejects.toMatchObject({ statusCode: 404 });
    });
});

describe("conferirPodeVincular", () => {
    it("aceita conta de candidato sem Google", async () => {
        const usuario = conta();
        Usuario.findByPk.mockResolvedValue(usuario);
        await expect(GoogleAuthService.conferirPodeVincular("u1")).resolves.toBe(usuario);
    });

    it.each(["empresa", "administrador"])("recusa conta de %s com 403", async (tipoUsuario) => {
        Usuario.findByPk.mockResolvedValue(conta({ tipoUsuario }));
        await expect(GoogleAuthService.conferirPodeVincular("u1")).rejects.toMatchObject({
            statusCode: 403,
            message: expect.stringContaining("só para contas de candidato")
        });
    });

    it("recusa com 409 a conta que já tem um Google, pedindo para desvincular antes", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ googleId: "sub-antigo" }));
        await expect(GoogleAuthService.conferirPodeVincular("u1")).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining("Desvincule")
        });
    });
});

describe("vincular", () => {
    beforeEach(() => {
        Usuario.findOne.mockResolvedValue(null);
        EmailService.disponivel.mockReturnValue(false);
    });

    it("grava o sub na conta de quem está autenticado", async () => {
        const usuario = conta();
        Usuario.findByPk.mockResolvedValue(usuario);

        await GoogleAuthService.vincular("u1", perfilGoogle);

        expect(usuario.update).toHaveBeenCalledWith({ googleId: "sub-1" });
    });

    it("recusa com 409 quando o sub já está em outra conta", async () => {
        Usuario.findByPk.mockResolvedValue(conta());
        Usuario.findOne.mockResolvedValue({ id: "u2" });

        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).rejects.toMatchObject({ statusCode: 409 });
    });

    it("recusa com 409 quando o banco acusa o índice único (duas vinculações ao mesmo tempo)", async () => {
        const usuario = conta();
        usuario.update.mockRejectedValue(Object.assign(new Error("duplicado"), { name: "SequelizeUniqueConstraintError" }));
        Usuario.findByPk.mockResolvedValue(usuario);

        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).rejects.toMatchObject({ statusCode: 409 });
    });

    it("não esconde um erro de banco que não é de unicidade", async () => {
        const usuario = conta();
        usuario.update.mockRejectedValue(new Error("banco fora do ar"));
        Usuario.findByPk.mockResolvedValue(usuario);

        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).rejects.toThrow("banco fora do ar");
    });

    it.each(["empresa", "administrador"])("recusa conta de %s com 403, sem gravar", async (tipoUsuario) => {
        const usuario = conta({ tipoUsuario });
        Usuario.findByPk.mockResolvedValue(usuario);

        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).rejects.toMatchObject({ statusCode: 403 });
        expect(usuario.update).not.toHaveBeenCalled();
    });

    it("recusa outro Google quando a conta já tem um, sem trocar o vínculo em silêncio", async () => {
        const usuario = conta({ googleId: "sub-antigo" });
        Usuario.findByPk.mockResolvedValue(usuario);

        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).rejects.toMatchObject({ statusCode: 409 });
        expect(usuario.update).not.toHaveBeenCalled();
    });

    it("aceita revincular o mesmo sub à mesma conta, sem avisar de novo", async () => {
        const usuario = conta({ googleId: "sub-1" });
        Usuario.findByPk.mockResolvedValue(usuario);

        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).resolves.toBe(usuario);
        expect(usuario.update).not.toHaveBeenCalled();
        expect(NotificacaoService.criar).not.toHaveBeenCalled();
    });

    it("recusa com 404 quando o usuário não existe", async () => {
        Usuario.findByPk.mockResolvedValue(null);
        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).rejects.toMatchObject({ statusCode: 404 });
    });

    // Achado 20: um segundo meio de entrar na conta é o que a pessoa mais precisa notar.
    it("avisa a pessoa no Site", async () => {
        Usuario.findByPk.mockResolvedValue(conta());

        await GoogleAuthService.vincular("u1", perfilGoogle);

        expect(NotificacaoService.criar).toHaveBeenCalledWith(
            expect.objectContaining({ usuarioId: "u1", tipo: "sistema", subtipo: "google_vinculado", titulo: "Conta Google vinculada" })
        );
    });

    it("avisa a pessoa por e-mail, para o endereço da conta (e não o do Google)", async () => {
        Usuario.findByPk.mockResolvedValue(conta());
        EmailService.disponivel.mockReturnValue(true);

        await GoogleAuthService.vincular("u1", perfilGoogle);

        expect(EmailService.enviar).toHaveBeenCalledWith(
            expect.objectContaining({ para: "ana@exemplo.com", tag: "google-vinculado" })
        );
    });

    it("não avisa quando a vinculação é recusada", async () => {
        Usuario.findByPk.mockResolvedValue(conta());
        Usuario.findOne.mockResolvedValue({ id: "u2" });

        await GoogleAuthService.vincular("u1", perfilGoogle).catch(() => {});

        expect(NotificacaoService.criar).not.toHaveBeenCalled();
        expect(EmailService.enviar).not.toHaveBeenCalled();
    });

    it("conclui mesmo se o e-mail de aviso falhar, e registra a falha sem dados pessoais", async () => {
        const usuario = conta();
        Usuario.findByPk.mockResolvedValue(usuario);
        EmailService.disponivel.mockReturnValue(true);
        EmailService.enviar.mockRejectedValue(new Error("Brevo fora do ar"));

        await expect(GoogleAuthService.vincular("u1", perfilGoogle)).resolves.toBe(usuario);

        const registro = console.error.mock.calls.map(([linha]) => String(linha)).join("\n");
        expect(registro).toContain("Brevo fora do ar");
        expect(registro).not.toContain("ana@exemplo.com");
    });

    it("registra o vínculo no log só com o id da conta", async () => {
        Usuario.findByPk.mockResolvedValue(conta());

        await GoogleAuthService.vincular("u1", perfilGoogle);

        const linha = String(console.info.mock.calls[0][0]);
        expect(JSON.parse(linha)).toMatchObject({ acao: "google_vinculado", usuarioId: "u1" });
        expect(linha).not.toContain("sub-1");
        expect(linha).not.toContain("ana@");
    });
});

describe("desvincular", () => {
    beforeEach(() => {
        EmailService.disponivel.mockReturnValue(false);
    });

    it("apaga o vínculo da conta", async () => {
        const usuario = conta({ googleId: "sub-1", senhaHash: "hash" });
        comSenha.findByPk.mockResolvedValue(usuario);

        await GoogleAuthService.desvincular("u1");

        expect(usuario.update).toHaveBeenCalledWith({ googleId: null });
    });

    it("recusa com 409 a conta que não tem Google", async () => {
        const usuario = conta({ senhaHash: "hash" });
        comSenha.findByPk.mockResolvedValue(usuario);

        await expect(GoogleAuthService.desvincular("u1")).rejects.toMatchObject({ statusCode: 409 });
        expect(usuario.update).not.toHaveBeenCalled();
    });

    it("recusa com 409 desvincular quando a conta não tem senha: o Google seria o único jeito de entrar", async () => {
        const usuario = conta({ googleId: "sub-1", senhaHash: null });
        comSenha.findByPk.mockResolvedValue(usuario);

        await expect(GoogleAuthService.desvincular("u1")).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining("senha")
        });
        expect(usuario.update).not.toHaveBeenCalled();
    });

    it("recusa com 404 quando o usuário não existe", async () => {
        comSenha.findByPk.mockResolvedValue(null);
        await expect(GoogleAuthService.desvincular("u1")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("avisa a pessoa no Site e por e-mail", async () => {
        comSenha.findByPk.mockResolvedValue(conta({ googleId: "sub-1", senhaHash: "hash" }));
        EmailService.disponivel.mockReturnValue(true);

        await GoogleAuthService.desvincular("u1");

        expect(NotificacaoService.criar).toHaveBeenCalledWith(
            expect.objectContaining({ usuarioId: "u1", subtipo: "google_desvinculado", titulo: "Conta Google desvinculada" })
        );
        expect(EmailService.enviar).toHaveBeenCalledWith(expect.objectContaining({ tag: "google-desvinculado" }));
    });

    it("não avisa quando o desvínculo é recusado", async () => {
        comSenha.findByPk.mockResolvedValue(conta({ senhaHash: "hash" }));

        await GoogleAuthService.desvincular("u1").catch(() => {});

        expect(NotificacaoService.criar).not.toHaveBeenCalled();
    });
});
