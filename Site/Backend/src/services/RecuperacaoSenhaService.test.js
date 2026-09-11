import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `RecuperacaoSenhaService` (Auditoria do Site — item 1).
 *
 * Nenhum destes testes toca o banco real: `Usuario`/`CodigoRecuperacaoSenha`
 * e os serviços colaboradores (e-mail, refresh token, aviso de senha
 * alterada) são mockados — igual ao padrão de `PostagemService.test.js`.
 * `../utils/tokens.js` (hash/geração) NÃO é mockado de propósito: o que
 * este arquivo protege é justamente que os dois segredos (token opaco e
 * código de 6 dígitos) são gerados, hasheados e comparados de verdade.
 */

vi.mock("../config/database.js", () => ({
    default: {
        transaction: vi.fn(async () => ({
            commit: vi.fn(),
            rollback: vi.fn()
        }))
    }
}));

const comSenhaMock = { senhaHash: null, save: vi.fn() };

vi.mock("../models/index.js", () => ({
    Usuario: {
        findOne: vi.fn(),
        findByPk: vi.fn(),
        scope: vi.fn(() => ({ findByPk: vi.fn() }))
    },
    CodigoRecuperacaoSenha: {
        update: vi.fn(),
        create: vi.fn(),
        findOne: vi.fn()
    }
}));

vi.mock("../utils/bcrypt.js", () => ({
    hashPassword: vi.fn(async (senha) => `hash:${senha}`)
}));

vi.mock("./RefreshTokenService.js", () => ({
    default: { revogarTodos: vi.fn() }
}));

vi.mock("./EmailService.js", () => ({
    default: { disponivel: vi.fn(() => false), enviar: vi.fn() }
}));

vi.mock("./authService.js", () => ({
    default: { avisarSenhaAlterada: vi.fn() }
}));

vi.mock("../utils/emailTemplates.js", () => ({
    templateRecuperacaoSenha: vi.fn(() => ({ assunto: "a", html: "h", texto: "t" }))
}));

vi.mock("../utils/frontendUrl.js", () => ({
    montarUrlFrontend: vi.fn((caminho, params) => `https://acesso.exemplo${caminho}?${new URLSearchParams(params).toString()}`)
}));

const { Usuario, CodigoRecuperacaoSenha } = await import("../models/index.js");
const { default: RefreshTokenService } = await import("./RefreshTokenService.js");
const { default: authService } = await import("./authService.js");
const { default: EmailService } = await import("./EmailService.js");
const { montarUrlFrontend } = await import("../utils/frontendUrl.js");
const { hashToken } = await import("../utils/tokens.js");
const { default: RecuperacaoSenhaService } = await import("./RecuperacaoSenhaService.js");

const USUARIO = { id: "u1", nome: "Ana", email: "ana@exemplo.com", ativo: true };

beforeEach(() => {
    vi.clearAllMocks();
    Usuario.scope.mockReturnValue({ findByPk: vi.fn(async () => ({ ...comSenhaMock, save: vi.fn() })) });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("RecuperacaoSenhaService.solicitar", () => {
    it("usuário inexistente: resposta genérica, nenhum registro criado", async () => {
        Usuario.findOne.mockResolvedValue(null);

        const resultado = await RecuperacaoSenhaService.solicitar("ninguem@exemplo.com");

        expect(resultado.mensagem).toMatch(/se encontrarmos/i);
        expect(CodigoRecuperacaoSenha.create).not.toHaveBeenCalled();
    });

    it("usuário inativo: resposta genérica, nenhum registro criado (anti-enumeração)", async () => {
        Usuario.findOne.mockResolvedValue({ ...USUARIO, ativo: false });

        await RecuperacaoSenhaService.solicitar(USUARIO.email);

        expect(CodigoRecuperacaoSenha.create).not.toHaveBeenCalled();
    });

    it("usuário válido: invalida registros anteriores e cria um novo com código E token, cada um com hash próprio", async () => {
        Usuario.findOne.mockResolvedValue(USUARIO);

        await RecuperacaoSenhaService.solicitar(USUARIO.email, { ip: "127.0.0.1" });

        expect(CodigoRecuperacaoSenha.update).toHaveBeenCalledWith(
            { utilizadoEm: expect.any(Date) },
            { where: { usuarioId: USUARIO.id, utilizadoEm: null } }
        );

        expect(CodigoRecuperacaoSenha.create).toHaveBeenCalledTimes(1);
        const dadosCriados = CodigoRecuperacaoSenha.create.mock.calls[0][0];
        expect(dadosCriados.usuarioId).toBe(USUARIO.id);
        expect(dadosCriados.codigoHash).toEqual(expect.any(String));
        expect(dadosCriados.tokenHash).toEqual(expect.any(String));
        // Dois segredos independentes — nunca o mesmo valor hasheado duas vezes.
        expect(dadosCriados.codigoHash).not.toBe(dadosCriados.tokenHash);
        expect(dadosCriados.codigoHash).toHaveLength(64); // SHA-256 em hex
        expect(dadosCriados.tokenHash).toHaveLength(64);
    });

    it("o link do e-mail carrega o TOKEN — nunca o e-mail nem o código de 6 dígitos", async () => {
        Usuario.findOne.mockResolvedValue(USUARIO);
        EmailService.disponivel.mockReturnValue(true);

        await RecuperacaoSenhaService.solicitar(USUARIO.email);

        expect(montarUrlFrontend).toHaveBeenCalledWith(
            "/redefinir-senha",
            expect.objectContaining({ token: expect.any(String) })
        );
        const paramsPassados = montarUrlFrontend.mock.calls[0][1];
        expect(paramsPassados).not.toHaveProperty("email");
        expect(paramsPassados).not.toHaveProperty("codigo");
    });
});

describe("RecuperacaoSenhaService.redefinir — mecanismo principal (token)", () => {
    it("token válido: identifica o usuário só pelo hash (sem e-mail), aplica a senha, revoga sessões e avisa o usuário", async () => {
        const registro = { usuarioId: USUARIO.id, tentativas: 0, update: vi.fn() };
        CodigoRecuperacaoSenha.findOne.mockResolvedValue(registro);
        Usuario.findByPk.mockResolvedValue(USUARIO);

        const resultado = await RecuperacaoSenhaService.redefinir({
            token: "a".repeat(96),
            novaSenha: "Senha!Forte1"
        });

        expect(CodigoRecuperacaoSenha.findOne).toHaveBeenCalledWith({
            where: {
                tokenHash: hashToken("a".repeat(96)),
                utilizadoEm: null,
                expiraEm: expect.anything()
            }
        });
        expect(registro.update).toHaveBeenCalledWith(
            { utilizadoEm: expect.any(Date) },
            expect.objectContaining({ transaction: expect.anything() })
        );
        expect(RefreshTokenService.revogarTodos).toHaveBeenCalledWith(USUARIO.id);
        expect(authService.avisarSenhaAlterada).toHaveBeenCalledWith(USUARIO);
        expect(resultado.mensagem).toMatch(/redefinida com sucesso/i);
    });

    it("token inexistente/expirado/já usado: erro genérico, não revela detalhe", async () => {
        CodigoRecuperacaoSenha.findOne.mockResolvedValue(null);

        await expect(
            RecuperacaoSenhaService.redefinir({ token: "token-invalido", novaSenha: "Senha!Forte1" })
        ).rejects.toMatchObject({ statusCode: 400 });

        expect(RefreshTokenService.revogarTodos).not.toHaveBeenCalled();
    });

    it("token aponta para usuário que não existe mais: erro genérico, não quebra", async () => {
        CodigoRecuperacaoSenha.findOne.mockResolvedValue({ usuarioId: "fantasma", update: vi.fn() });
        Usuario.findByPk.mockResolvedValue(null);

        await expect(
            RecuperacaoSenhaService.redefinir({ token: "a".repeat(96), novaSenha: "Senha!Forte1" })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("não tem limite de tentativas por chamada (o espaço de busca do token torna isso irrelevante)", async () => {
        // Nenhuma verificação de `tentativas` deve acontecer no fluxo por
        // token — mesmo um `registro` com `tentativas` alto (herdado da
        // MESMA linha, se um dia o código tiver sido tentado antes) não pode
        // bloquear o token, que é um segredo totalmente diferente.
        const registro = { usuarioId: USUARIO.id, tentativas: 999, update: vi.fn() };
        CodigoRecuperacaoSenha.findOne.mockResolvedValue(registro);
        Usuario.findByPk.mockResolvedValue(USUARIO);

        await expect(
            RecuperacaoSenhaService.redefinir({ token: "a".repeat(96), novaSenha: "Senha!Forte1" })
        ).resolves.toMatchObject({ mensagem: expect.any(String) });
    });
});

describe("RecuperacaoSenhaService.redefinir — fallback (código de 6 dígitos, usado pelo app)", () => {
    it("código correto: aplica a senha normalmente (comportamento pré-existente preservado)", async () => {
        const registro = { tentativas: 0, codigoHash: hashToken("123456"), update: vi.fn(), increment: vi.fn() };
        Usuario.findOne.mockResolvedValue(USUARIO);
        CodigoRecuperacaoSenha.findOne.mockResolvedValue(registro);

        const resultado = await RecuperacaoSenhaService.redefinir({
            email: USUARIO.email,
            codigo: "123456",
            novaSenha: "Senha!Forte1"
        });

        expect(resultado.mensagem).toMatch(/redefinida com sucesso/i);
        expect(registro.update).toHaveBeenCalledWith({ utilizadoEm: expect.any(Date) }, expect.anything());
        expect(RefreshTokenService.revogarTodos).toHaveBeenCalledWith(USUARIO.id);
    });

    it("código incorreto: incrementa tentativas e não altera a senha", async () => {
        const registro = { tentativas: 0, codigoHash: hashToken("123456"), update: vi.fn(), increment: vi.fn() };
        Usuario.findOne.mockResolvedValue(USUARIO);
        CodigoRecuperacaoSenha.findOne.mockResolvedValue(registro);

        await expect(
            RecuperacaoSenhaService.redefinir({ email: USUARIO.email, codigo: "000000", novaSenha: "Senha!Forte1" })
        ).rejects.toMatchObject({ statusCode: 400 });

        expect(registro.increment).toHaveBeenCalledWith("tentativas");
        expect(RefreshTokenService.revogarTodos).not.toHaveBeenCalled();
    });

    it("tentativas esgotadas: marca a linha como usada e recusa mesmo com o código certo", async () => {
        const registro = { tentativas: 5, codigoHash: hashToken("123456"), update: vi.fn(), increment: vi.fn() };
        Usuario.findOne.mockResolvedValue(USUARIO);
        CodigoRecuperacaoSenha.findOne.mockResolvedValue(registro);

        await expect(
            RecuperacaoSenhaService.redefinir({ email: USUARIO.email, codigo: "123456", novaSenha: "Senha!Forte1" })
        ).rejects.toMatchObject({ statusCode: 400 });

        expect(registro.update).toHaveBeenCalledWith({ utilizadoEm: expect.any(Date) });
    });

    it("nenhum registro válido (expirado/já usado/inexistente): erro genérico", async () => {
        Usuario.findOne.mockResolvedValue(USUARIO);
        CodigoRecuperacaoSenha.findOne.mockResolvedValue(null);

        await expect(
            RecuperacaoSenhaService.redefinir({ email: USUARIO.email, codigo: "123456", novaSenha: "Senha!Forte1" })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("e-mail sem conta correspondente: mesmo erro genérico do código inválido (anti-enumeração)", async () => {
        Usuario.findOne.mockResolvedValue(null);

        await expect(
            RecuperacaoSenhaService.redefinir({ email: "ninguem@exemplo.com", codigo: "123456", novaSenha: "Senha!Forte1" })
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});
