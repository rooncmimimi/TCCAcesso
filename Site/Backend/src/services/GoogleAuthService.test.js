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

vi.mock("../models/index.js", () => ({
    Usuario: { findOne: vi.fn(), findByPk: vi.fn() }
}));

const { Usuario } = await import("../models/index.js");
const { default: GoogleAuthService } = await import("./GoogleAuthService.js");

const CONFIG_PADRAO = { ...env.google };

beforeEach(() => {
    vi.clearAllMocks();
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
        expect(statusDe(() => GoogleAuthService.gerarUrlDeAutorizacao())).toBe(503);
    });
});

describe("gerarUrlDeAutorizacao", () => {
    it("pede só openid, email e profile, com seleção de conta e sem escopos já concedidos", () => {
        GoogleAuthService.gerarUrlDeAutorizacao();

        const pedido = clienteGoogle.generateAuthUrl.mock.calls[0][0];
        expect(pedido.scope).toEqual(["openid", "email", "profile"]);
        expect(pedido.prompt).toBe("select_account");
        expect(pedido.include_granted_scopes).toBe(false);
        expect(pedido).not.toHaveProperty("access_type");
    });

    it("assina o state por 10 minutos e usa o mesmo nonce no state e no pedido ao Google", () => {
        const { state } = GoogleAuthService.gerarUrlDeAutorizacao({ tipoConta: "empresa", origem: "http://localhost:5173" });

        const conteudo = jwt.verify(state, SEGREDO);
        expect(conteudo.tipoConta).toBe("empresa");
        expect(conteudo.origem).toBe("http://localhost:5173");
        expect(conteudo.exp - conteudo.iat).toBe(600);
        expect(conteudo.nonce).toMatch(/^[0-9a-f]{32}$/);
        expect(clienteGoogle.generateAuthUrl.mock.calls[0][0].nonce).toBe(conteudo.nonce);
    });

    it("gera um nonce novo a cada pedido", () => {
        const a = jwt.decode(GoogleAuthService.gerarUrlDeAutorizacao().state).nonce;
        const b = jwt.decode(GoogleAuthService.gerarUrlDeAutorizacao().state).nonce;
        expect(a).not.toBe(b);
    });

    it.each(["administrador", "candidato ", "EMPRESA", "x"])("recusa tipoConta %j com 400", (tipoConta) => {
        expect(statusDe(() => GoogleAuthService.gerarUrlDeAutorizacao({ tipoConta }))).toBe(400);
    });

    it.each([null, "candidato", "empresa"])("aceita tipoConta %j", (tipoConta) => {
        expect(() => GoogleAuthService.gerarUrlDeAutorizacao({ tipoConta })).not.toThrow();
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
    const assinar = (conteudo, opcoes = { expiresIn: "10m" }) => jwt.sign(conteudo, SEGREDO, opcoes);

    it("devolve o conteúdo de um state válido", () => {
        expect(GoogleAuthService.lerState(assinar({ nonce: "n1", tipoConta: null }))).toMatchObject({ nonce: "n1" });
    });

    it("recusa state ausente com 400", () => {
        expect(statusDe(() => GoogleAuthService.lerState(undefined))).toBe(400);
    });

    it("recusa state expirado com 400", () => {
        expect(statusDe(() => GoogleAuthService.lerState(assinar({ nonce: "n1" }, { expiresIn: -10 })))).toBe(400);
    });

    it("recusa state assinado com outro segredo", () => {
        const falso = jwt.sign({ nonce: "n1" }, "outro-segredo-qualquer-com-bastante-tamanho", { expiresIn: "10m" });
        expect(statusDe(() => GoogleAuthService.lerState(falso))).toBe(400);
    });

    it("recusa state adulterado", () => {
        const [cabecalho, , assinatura] = assinar({ nonce: "n1" }).split(".");
        const corpoTrocado = Buffer.from(JSON.stringify({ nonce: "n2", exp: 9999999999 })).toString("base64url");
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

describe("vincular", () => {
    const perfil = { sub: "sub-1", email: "ana@exemplo.com", emailVerificado: true, nome: "Ana" };

    it("grava o sub na conta de quem está autenticado", async () => {
        const update = vi.fn();
        Usuario.findOne.mockResolvedValue(null);
        Usuario.findByPk.mockResolvedValue({ id: "u1", update });

        await GoogleAuthService.vincular("u1", perfil);
        expect(update).toHaveBeenCalledWith({ googleId: "sub-1" });
    });

    it("recusa com 409 quando o sub já está em outra conta", async () => {
        Usuario.findOne.mockResolvedValue({ id: "u2" });
        await expect(GoogleAuthService.vincular("u1", perfil)).rejects.toMatchObject({ statusCode: 409 });
    });

    it("aceita revincular o mesmo sub à mesma conta", async () => {
        const update = vi.fn();
        Usuario.findOne.mockResolvedValue({ id: "u1" });
        Usuario.findByPk.mockResolvedValue({ id: "u1", update });
        await expect(GoogleAuthService.vincular("u1", perfil)).resolves.toBeTruthy();
    });

    it("recusa com 404 quando o usuário não existe", async () => {
        Usuario.findOne.mockResolvedValue(null);
        Usuario.findByPk.mockResolvedValue(null);
        await expect(GoogleAuthService.vincular("u1", perfil)).rejects.toMatchObject({ statusCode: 404 });
    });
});
