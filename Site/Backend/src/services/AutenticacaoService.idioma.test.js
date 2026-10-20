import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * O idioma da conta em `AutenticacaoService`: gravado no cadastro, trocado por `alterarIdioma` e
 * usado para escolher a língua dos e-mails. Sem banco real, no mesmo molde de
 * `RecuperacaoSenhaService.test.js`; os modelos de e-mail não são mockados de propósito, para o
 * teste ver o assunto que de fato sairia.
 */

vi.mock("../config/bancoDeDados.js", () => ({
    default: {
        transaction: vi.fn(async () => ({ commit: vi.fn(), rollback: vi.fn() }))
    }
}));

vi.mock("../models/index.js", () => ({
    Usuario: { create: vi.fn(), findOne: vi.fn(), findByPk: vi.fn(), scope: vi.fn() },
    Candidato: { create: vi.fn(), findOne: vi.fn() },
    Empresa: { create: vi.fn(), findOne: vi.fn() },
    CodigoVerificacaoEmail: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() }
}));

vi.mock("../utils/bcrypt.js", () => ({
    gerarHashSenha: vi.fn(async (senha) => `hash:${senha}`),
    compararSenha: vi.fn()
}));

vi.mock("./SessaoService.js", () => ({
    default: { emitir: vi.fn(async () => ({ refreshToken: "refresh" })), revogarTodos: vi.fn() }
}));

vi.mock("./EmailService.js", () => ({
    default: { disponivel: vi.fn(() => true), enviar: vi.fn() }
}));

vi.mock("./NotificacaoService.js", () => ({ default: { criar: vi.fn() } }));
vi.mock("./NotificacaoPushService.js", () => ({ default: { removerTodosDoUsuario: vi.fn() } }));
vi.mock("./AdminUsuarioService.js", () => ({ default: {} }));

const { Usuario, Candidato, Empresa } = await import("../models/index.js");
const { default: EmailService } = await import("./EmailService.js");
const { executarComIdioma } = await import("../i18n/idioma.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");

const DADOS_CANDIDATO = {
    nome: "Ana Souza",
    email: "ana@exemplo.com",
    senha: "Senha@123",
    telefone: "11999999999",
    cpf: "52998224725",
    pais: "BR",
    dataNascimento: "1990-01-01",
    cidade: "Recife",
    estado: "PE"
};

const DADOS_EMPRESA = {
    nome: "Acme",
    email: "contato@acme.com",
    senha: "Senha@123",
    cnpj: "11222333000181",
    razaoSocial: "Acme Ltda"
};

function criarUsuarioFalso(dados) {
    return { id: "u1", ...dados, toJSON: () => ({ id: "u1", ...dados }) };
}

beforeEach(() => {
    vi.clearAllMocks();
    Usuario.findOne.mockResolvedValue(null);
    Candidato.findOne.mockResolvedValue(null);
    Empresa.findOne.mockResolvedValue(null);
    Usuario.create.mockImplementation(async (dados) => criarUsuarioFalso(dados));
    EmailService.disponivel.mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("idioma no cadastro", () => {
    it("candidato: grava o idioma que a tela de cadastro mandou", async () => {
        await AutenticacaoService.cadastrarCandidato({ ...DADOS_CANDIDATO, idioma: "en" });

        expect(Usuario.create.mock.calls[0][0]).toMatchObject({ tipoUsuario: "candidato", idioma: "en" });
    });

    it("candidato: sem idioma no corpo, grava o da requisição", async () => {
        await executarComIdioma("es", () => AutenticacaoService.cadastrarCandidato(DADOS_CANDIDATO), {
            explicito: true
        });

        expect(Usuario.create.mock.calls[0][0].idioma).toBe("es");
    });

    it("candidato: idioma inválido no corpo não vai para o banco — vale o da requisição", async () => {
        await executarComIdioma("en", () => AutenticacaoService.cadastrarCandidato({ ...DADOS_CANDIDATO, idioma: "fr" }));

        expect(Usuario.create.mock.calls[0][0].idioma).toBe("en");
    });

    it("candidato: fora de uma requisição (script, teste) nasce em português", async () => {
        await AutenticacaoService.cadastrarCandidato(DADOS_CANDIDATO);

        expect(Usuario.create.mock.calls[0][0].idioma).toBe("pt");
    });

    it("empresa: grava o idioma informado", async () => {
        await AutenticacaoService.cadastrarEmpresa(
            { ...DADOS_EMPRESA, idioma: "es" },
            {},
            { id: "cand1", tipoUsuario: "candidato" }
        );

        expect(Usuario.create.mock.calls[0][0]).toMatchObject({ tipoUsuario: "empresa", idioma: "es" });
    });

    it("a sessão devolvida ao cadastrar já traz o idioma da conta", async () => {
        const sessao = await AutenticacaoService.cadastrarCandidato({ ...DADOS_CANDIDATO, idioma: "en" });

        expect(sessao.usuario.idioma).toBe("en");
    });
});

describe("e-mail de confirmação no idioma certo", () => {
    const assuntoEnviado = () => EmailService.enviar.mock.calls[0][0].assunto;

    it("sai no idioma da conta recém-criada", async () => {
        await AutenticacaoService.cadastrarCandidato({ ...DADOS_CANDIDATO, idioma: "en" });

        expect(assuntoEnviado()).toBe("Confirm your email — ACESSO");
    });

    it("em espanhol", async () => {
        await AutenticacaoService.cadastrarCandidato({ ...DADOS_CANDIDATO, idioma: "es" });

        expect(assuntoEnviado()).toBe("Confirma tu correo electrónico — ACESSO");
    });

    it("em português continua igual ao de antes", async () => {
        await AutenticacaoService.cadastrarCandidato(DADOS_CANDIDATO);

        expect(assuntoEnviado()).toBe("Confirme seu e-mail — ACESSO");
    });

    it("reenvio: vale o idioma escolhido na tela agora, mesmo que a conta esteja em outro", async () => {
        Usuario.findOne.mockResolvedValue({
            id: "u9",
            nome: "Ana",
            email: "ana@exemplo.com",
            emailVerificado: false,
            idioma: "pt"
        });

        await executarComIdioma("en", () => AutenticacaoService.reenviarConfirmacaoCadastro("ana@exemplo.com"), {
            explicito: true
        });

        expect(assuntoEnviado()).toBe("Confirm your email — ACESSO");
    });
});

describe("aviso de senha alterada", () => {
    const usuario = { id: "u1", nome: "Ana", email: "ana@exemplo.com", idioma: "en" };

    it("sem idioma na requisição, sai no idioma da conta", async () => {
        await AutenticacaoService.avisarSenhaAlterada(usuario);

        expect(EmailService.enviar.mock.calls[0][0].assunto).toBe("Your password was changed — ACESSO");
    });

    it("com idioma escolhido na requisição, vale o da requisição", async () => {
        await executarComIdioma("es", () => AutenticacaoService.avisarSenhaAlterada(usuario), { explicito: true });

        expect(EmailService.enviar.mock.calls[0][0].assunto).toBe("Tu contraseña fue cambiada — ACESSO");
    });
});

describe("alterarIdioma", () => {
    it("salva o idioma na conta e devolve a nova preferência", async () => {
        const usuario = { id: "u1", idioma: "pt", update: vi.fn(async function (campos) { Object.assign(this, campos); }) };
        Usuario.findByPk.mockResolvedValue(usuario);

        const resultado = await AutenticacaoService.alterarIdioma("u1", "es");

        expect(usuario.update).toHaveBeenCalledWith({ idioma: "es" });
        expect(resultado).toEqual({ mensagem: "Idioma atualizado com sucesso.", idioma: "es" });
    });

    it("não grava de novo quando o idioma já é o da conta", async () => {
        const usuario = { id: "u1", idioma: "en", update: vi.fn() };
        Usuario.findByPk.mockResolvedValue(usuario);

        const resultado = await AutenticacaoService.alterarIdioma("u1", "en");

        expect(usuario.update).not.toHaveBeenCalled();
        expect(resultado.idioma).toBe("en");
    });

    it("conta inexistente é 404", async () => {
        Usuario.findByPk.mockResolvedValue(null);

        await expect(AutenticacaoService.alterarIdioma("fantasma", "en")).rejects.toMatchObject({
            statusCode: 404,
            message: "Usuário não encontrado."
        });
    });
});
