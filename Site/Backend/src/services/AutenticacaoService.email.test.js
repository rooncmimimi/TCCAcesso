import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Uma só regra de e-mail em toda a autenticação (achado 2 da auditoria). O cadastro grava
 * `maria.silva@gmail.com` como `mariasilva@gmail.com`; login, confirmação, reenvio e troca de
 * e-mail precisam procurar exatamente esse texto, seja qual for a forma digitada.
 *
 * Sem banco real: modelos e serviços colaboradores são simulados, como em
 * `AutenticacaoService.google.test.js`.
 */

vi.mock("../config/env.js", () => ({
    default: { jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres", expiresIn: "30m" } }
}));

const { transacao, comSenha } = vi.hoisted(() => ({
    transacao: { commit: vi.fn(), rollback: vi.fn() },
    comSenha: { findOne: vi.fn(), findByPk: vi.fn() }
}));

vi.mock("../config/bancoDeDados.js", () => ({
    default: { transaction: vi.fn(async () => transacao) }
}));

vi.mock("../models/index.js", () => ({
    Usuario: { findOne: vi.fn(), findByPk: vi.fn(), create: vi.fn(), scope: vi.fn(() => comSenha) },
    Candidato: { findOne: vi.fn(), create: vi.fn() },
    Empresa: { findOne: vi.fn(), create: vi.fn() },
    CodigoVerificacaoEmail: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() }
}));

vi.mock("../utils/bcrypt.js", () => ({
    gerarHashSenha: vi.fn(async (senha) => `hash:${senha}`),
    compararSenha: vi.fn(async () => true)
}));

// A verificação em duas etapas tem testes próprios (TotpService.test.js); aqui ela fica desligada.
vi.mock("./TotpService.js", () => ({
    default: {
        habilitado: vi.fn(() => false),
        exigirHabilitado: vi.fn(),
        buscarAtivo: vi.fn(async () => null),
        conferirSegundoFator: vi.fn(),
        codigosRestantes: vi.fn(),
        situacaoDaConta: vi.fn(async () => ({ mfaDisponivel: false, mfaConfigurado: false, mfaExigido: false }))
    }
}));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: vi.fn() } }));
vi.mock("./SessaoService.js", () => ({
    default: { emitir: vi.fn(async () => ({ refreshToken: "refresh-de-teste" })), revogarTodos: vi.fn() }
}));

vi.mock("./EmailService.js", () => ({
    default: { disponivel: vi.fn(() => false), enviar: vi.fn() }
}));

vi.mock("./NotificacaoService.js", () => ({ default: { criar: vi.fn() } }));
vi.mock("./NotificacaoPushService.js", () => ({ default: { removerTodosDoUsuario: vi.fn() } }));
vi.mock("./AdminUsuarioService.js", () => ({ default: { excluirContaDefinitivamente: vi.fn() } }));
vi.mock("../utils/modelosEmail.js", () => ({
    modeloConfirmacaoCadastro: vi.fn(() => ({ assunto: "a", html: "h", texto: "t" })),
    modeloConfirmacaoTrocaEmail: vi.fn(() => ({ assunto: "a", html: "h", texto: "t" })),
    modeloSenhaAlterada: vi.fn()
}));
vi.mock("../utils/urlFrontend.js", () => ({ montarUrlFrontend: vi.fn(() => "https://site.exemplo/x") }));

const { Usuario, Candidato } = await import("../models/index.js");
const { default: SessaoService } = await import("./SessaoService.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");

const CANONICO = "mariasilva@gmail.com";
const FORMAS_DIGITADAS = ["maria.silva@gmail.com", "Maria.Silva+acesso@Gmail.com", "  MARIA.SILVA@googlemail.com ", CANONICO];

const contaGravada = (extra = {}) => ({
    id: "u1",
    email: CANONICO,
    senhaHash: "hash:Senha@1234",
    tipoUsuario: "candidato",
    ativo: true,
    bloqueado: false,
    emailVerificado: true,
    pausadoPeloUsuario: false,
    save: vi.fn(),
    toJSON() {
        return { id: this.id, email: this.email, tipoUsuario: this.tipoUsuario };
    },
    ...extra
});

beforeEach(() => {
    vi.clearAllMocks();
    Usuario.scope.mockReturnValue(comSenha);
    SessaoService.emitir.mockResolvedValue({ refreshToken: "refresh-de-teste" });
});

describe("normalizarEmail", () => {
    it.each(FORMAS_DIGITADAS)("%j vira a forma que o cadastro grava", (digitado) => {
        expect(AutenticacaoService.normalizarEmail(digitado)).toBe(CANONICO);
    });
});

describe("login", () => {
    it.each(FORMAS_DIGITADAS)("acha a conta gravada na forma canônica digitando %j", async (digitado) => {
        comSenha.findOne.mockImplementation(async ({ where }) => (where.email === CANONICO ? contaGravada() : null));

        const resultado = await AutenticacaoService.entrar(digitado, "Senha@1234");

        expect(comSenha.findOne).toHaveBeenCalledWith({ where: { email: CANONICO } });
        expect(resultado).toMatchObject({ token: expect.any(String), refreshToken: "refresh-de-teste" });
    });

    it("e-mail sem conta continua com a resposta genérica de credenciais inválidas", async () => {
        comSenha.findOne.mockResolvedValue(null);
        await expect(AutenticacaoService.entrar("outra.pessoa@gmail.com", "Senha@1234")).rejects.toMatchObject({
            statusCode: 401,
            message: "E-mail ou senha inválidos."
        });
    });
});

describe("cadastro", () => {
    const dados = (email) => ({
        nome: "Maria Silva",
        email,
        senha: "Senha@1234",
        telefone: "11999999999",
        cpf: "12345678901",
        pais: "br",
        dataNascimento: "1990-05-10",
        cidade: "São Paulo",
        estado: "sp"
    });

    beforeEach(() => {
        Usuario.findOne.mockResolvedValue(null);
        Candidato.findOne.mockResolvedValue(null);
        Usuario.create.mockImplementation(async (d) => ({ id: "novo", ...d, toJSON: () => ({ id: "novo", ...d }) }));
        Candidato.create.mockResolvedValue({ id: "c1" });
    });

    it.each(FORMAS_DIGITADAS)("grava %j na forma canônica", async (digitado) => {
        await AutenticacaoService.cadastrarCandidato(dados(digitado));
        expect(Usuario.create.mock.calls[0][0].email).toBe(CANONICO);
    });

    it("reconhece como já cadastrado o mesmo endereço do Gmail escrito de outro jeito", async () => {
        Usuario.findOne.mockImplementation(async ({ where }) => (where.email === CANONICO ? contaGravada() : null));

        await expect(AutenticacaoService.cadastrarCandidato(dados("maria.silva@gmail.com"))).rejects.toMatchObject({ statusCode: 409 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });
});

describe("confirmação de cadastro", () => {
    it("confirmarEmailCadastro procura a conta pela forma canônica", async () => {
        Usuario.findOne.mockResolvedValue(null);
        await AutenticacaoService.confirmarEmailCadastro("Maria.Silva@Gmail.com", "123456").catch(() => {});
        expect(Usuario.findOne).toHaveBeenCalledWith({ where: { email: CANONICO } });
    });

    it("reenviarConfirmacaoCadastro procura a conta pela forma canônica", async () => {
        Usuario.findOne.mockResolvedValue(null);
        await AutenticacaoService.reenviarConfirmacaoCadastro("maria.silva+x@gmail.com");
        expect(Usuario.findOne).toHaveBeenCalledWith({ where: { email: CANONICO } });
    });
});

describe("troca de e-mail", () => {
    beforeEach(() => {
        comSenha.findByPk.mockResolvedValue(contaGravada());
    });

    it("trata o mesmo endereço do Gmail, escrito de outro jeito, como o e-mail atual", async () => {
        await expect(AutenticacaoService.solicitarTrocaEmail("u1", "Senha@1234", "maria.silva@gmail.com")).rejects.toMatchObject({
            statusCode: 400,
            message: "Este já é o seu e-mail atual."
        });
    });

    it("recusa um e-mail novo que já pertence a outra conta, mesmo digitado de outro jeito", async () => {
        Usuario.findOne.mockImplementation(async ({ where }) => (where.email === "joaosilva@gmail.com" ? contaGravada({ id: "u2" }) : null));

        await expect(AutenticacaoService.solicitarTrocaEmail("u1", "Senha@1234", "Joao.Silva@gmail.com")).rejects.toMatchObject({
            statusCode: 409
        });
    });
});
