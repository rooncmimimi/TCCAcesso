import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Conta que entra só pelo Google e ainda não tem senha (etapa 6 da auditoria). O que se garante aqui:
 * o login por senha não a abre nem a distingue de um e-mail que não existe, as ações que pedem a
 * "senha atual" dizem o que fazer em vez de "senha incorreta", e o Site recebe `temSenha` e
 * `dadosPessoaisPendentes`.
 *
 * Sem banco real: modelos, transação e colaboradores são simulados, como em
 * `AutenticacaoService.google.test.js`.
 */

vi.mock("../config/env.js", () => ({
    default: { jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres", expiresIn: "30m" } }
}));

const { transacao, comSenha } = vi.hoisted(() => ({
    transacao: { commit: vi.fn(), rollback: vi.fn() },
    comSenha: { findByPk: vi.fn(), findOne: vi.fn() }
}));

vi.mock("../config/bancoDeDados.js", () => ({
    default: { transaction: vi.fn(async () => transacao) }
}));

vi.mock("../models/index.js", () => ({
    Usuario: { findOne: vi.fn(), findByPk: vi.fn(), create: vi.fn(), scope: vi.fn() },
    Candidato: { findOne: vi.fn(), create: vi.fn() },
    Empresa: { findOne: vi.fn(), create: vi.fn() },
    CodigoVerificacaoEmail: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() }
}));

vi.mock("../utils/bcrypt.js", () => ({
    gerarHashSenha: vi.fn(async (senha) => `hash:${senha}`),
    compararSenha: vi.fn()
}));

vi.mock("./SessaoService.js", () => ({
    default: { emitir: vi.fn(async () => ({ refreshToken: "refresh-de-teste" })), revogarTodos: vi.fn() }
}));
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

const { Usuario, Candidato } = await import("../models/index.js");
const { compararSenha } = await import("../utils/bcrypt.js");
const { default: SessaoService } = await import("./SessaoService.js");
const { default: AdminUsuarioService } = await import("./AdminUsuarioService.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");

/** Uma conta como o modelo a devolve. `senhaHash: null` é a conta que entra só pelo Google. */
const conta = (extra = {}) => ({
    id: "u1",
    nome: "Ana Souza",
    email: "ana@exemplo.com",
    tipoUsuario: "candidato",
    ativo: true,
    bloqueado: false,
    emailVerificado: true,
    pausadoPeloUsuario: false,
    googleId: "sub-1",
    senhaHash: null,
    cadastroConcluidoEm: null,
    save: vi.fn(),
    toJSON() {
        return { id: this.id, tipoUsuario: this.tipoUsuario, cadastroConcluidoEm: this.cadastroConcluidoEm, senhaHash: this.senhaHash };
    },
    ...extra
});

beforeEach(() => {
    vi.resetAllMocks();
    Usuario.scope.mockReturnValue(comSenha);
    SessaoService.emitir.mockResolvedValue({ refreshToken: "refresh-de-teste" });
    Candidato.findOne.mockResolvedValue({ cpfHash: "h", dataNascimento: "1990-01-01", cidade: "SP", estado: "SP", pais: "BR" });
});

describe("login por senha de uma conta sem senha", () => {
    it("responde exatamente como para um e-mail que não existe: mensagem genérica, 401", async () => {
        comSenha.findOne.mockResolvedValue(null);
        const inexistente = await AutenticacaoService.entrar("naoexiste@exemplo.com", "Senha@1234").catch((e) => e);

        comSenha.findOne.mockResolvedValue(conta({ senhaHash: null }));
        const semSenha = await AutenticacaoService.entrar("ana@exemplo.com", "Senha@1234").catch((e) => e);

        expect(semSenha.statusCode).toBe(401);
        expect(semSenha.message).toBe(inexistente.message);
        expect(semSenha.message).toBe("E-mail ou senha inválidos.");
    });

    it("faz a comparação do bcrypt mesmo assim (mesmo tempo de resposta), contra um hash de referência", async () => {
        comSenha.findOne.mockResolvedValue(conta({ senhaHash: null }));
        compararSenha.mockResolvedValue(false);

        await AutenticacaoService.entrar("ana@exemplo.com", "Senha@1234").catch(() => {});

        expect(compararSenha).toHaveBeenCalledTimes(1);
        expect(compararSenha.mock.calls[0][1]).toMatch(/^\$2b\$12\$/);
    });

    it("não abre sessão", async () => {
        comSenha.findOne.mockResolvedValue(conta({ senhaHash: null }));
        compararSenha.mockResolvedValue(false);

        await AutenticacaoService.entrar("ana@exemplo.com", "Senha@1234").catch(() => {});

        expect(SessaoService.emitir).not.toHaveBeenCalled();
    });
});

describe("ações que pedem a senha atual, numa conta sem senha", () => {
    beforeEach(() => {
        comSenha.findByPk.mockResolvedValue(conta({ senhaHash: null }));
    });

    const acoes = [
        ["alterarSenha", (s) => s.alterarSenha("u1", "qualquer", "NovaSenha@123")],
        ["pausarConta", (s) => s.pausarConta("u1", "qualquer")],
        ["excluirConta", (s) => s.excluirConta("u1", "qualquer")],
        ["solicitarTrocaEmail", (s) => s.solicitarTrocaEmail("u1", "qualquer", "novo@exemplo.com")]
    ];

    it.each(acoes)("%s: responde 409 com o código SEM_SENHA e diz o que fazer", async (_nome, chamar) => {
        const erro = await chamar(AutenticacaoService).catch((e) => e);

        expect(erro).toMatchObject({ statusCode: 409, detalhes: { codigo: "SEM_SENHA" } });
        expect(erro.message).toMatch(/Defina uma senha/);
    });

    it.each(acoes)("%s: não compara senha nem altera nada", async (_nome, chamar) => {
        await chamar(AutenticacaoService).catch(() => {});

        expect(compararSenha).not.toHaveBeenCalled();
        expect(SessaoService.revogarTodos).not.toHaveBeenCalled();
        expect(AdminUsuarioService.excluirContaDefinitivamente).not.toHaveBeenCalled();
    });

    it("com senha definida, as ações continuam como antes (a senha errada ainda é recusada)", async () => {
        comSenha.findByPk.mockResolvedValue(conta({ senhaHash: "hash-da-senha" }));
        compararSenha.mockResolvedValue(false);

        const erro = await AutenticacaoService.pausarConta("u1", "errada").catch((e) => e);

        expect(erro).toMatchObject({ statusCode: 401, message: "Senha atual incorreta." });
    });
});

describe("situacaoDaConta", () => {
    it("usa o hash que já está na instância, sem consultar o banco (conta recém-criada)", async () => {
        const situacao = await AutenticacaoService.situacaoDaConta(conta({ senhaHash: "hash" }));

        expect(situacao.temSenha).toBe(true);
        expect(comSenha.findByPk).not.toHaveBeenCalled();
    });

    it("conta sem senha na instância: temSenha falso, também sem consultar", async () => {
        const situacao = await AutenticacaoService.situacaoDaConta(conta({ senhaHash: null }));

        expect(situacao.temSenha).toBe(false);
        expect(comSenha.findByPk).not.toHaveBeenCalled();
    });

    it("instância sem o campo (escopo padrão): pergunta ao banco só pelo hash", async () => {
        const { senhaHash: _omitido, ...semCampo } = conta();
        comSenha.findByPk.mockResolvedValue({ id: "u1", senhaHash: "hash" });

        const situacao = await AutenticacaoService.situacaoDaConta({ ...semCampo, senhaHash: undefined });

        expect(situacao.temSenha).toBe(true);
        expect(comSenha.findByPk).toHaveBeenCalledWith("u1", { attributes: ["id", "senhaHash"] });
    });

    it("nunca devolve o hash, só o booleano", async () => {
        const situacao = await AutenticacaoService.situacaoDaConta(conta({ senhaHash: "hash-secreto" }));

        expect(JSON.stringify(situacao)).not.toContain("hash-secreto");
    });

    describe("dados pessoais pendentes", () => {
        it("candidato com cadastro não concluído e sem CPF: pendente", async () => {
            Candidato.findOne.mockResolvedValue({ cpfHash: null, dataNascimento: null, cidade: null, estado: null, pais: null });

            expect((await AutenticacaoService.situacaoDaConta(conta())).dadosPessoaisPendentes).toBe(true);
        });

        it("falta só o CPF: pendente", async () => {
            Candidato.findOne.mockResolvedValue({ cpfHash: null, dataNascimento: "1990-01-01", cidade: "SP", estado: "SP", pais: "BR" });

            expect((await AutenticacaoService.situacaoDaConta(conta())).dadosPessoaisPendentes).toBe(true);
        });

        // Conta com CPF que está sem outro dado obrigatório (conta antiga) é o `cadastroPendente`, que pede só o
        // que falta. Mandá-la a `/cadastro/dados` a faria digitar o CPF de novo.
        it.each(["dataNascimento", "cidade", "estado", "pais"])("tem CPF e falta só %s: não é dadosPessoaisPendentes", async (coluna) => {
            Candidato.findOne.mockResolvedValue({ cpfHash: "h", dataNascimento: "1990-01-01", cidade: "SP", estado: "SP", pais: "BR", [coluna]: null });

            expect((await AutenticacaoService.situacaoDaConta(conta())).dadosPessoaisPendentes).toBe(false);
        });

        it("candidato com todos os dados: não pendente", async () => {
            expect((await AutenticacaoService.situacaoDaConta(conta())).dadosPessoaisPendentes).toBe(false);
        });

        it("candidato sem linha de perfil: pendente", async () => {
            Candidato.findOne.mockResolvedValue(null);

            expect((await AutenticacaoService.situacaoDaConta(conta())).dadosPessoaisPendentes).toBe(true);
        });

        it("cadastro já concluído nunca é mandado de volta, mesmo com dado antigo em branco", async () => {
            Candidato.findOne.mockResolvedValue({ cpfHash: null, dataNascimento: null, cidade: null, estado: null, pais: null });

            const situacao = await AutenticacaoService.situacaoDaConta(conta({ cadastroConcluidoEm: new Date() }));

            expect(situacao.dadosPessoaisPendentes).toBe(false);
            expect(Candidato.findOne).not.toHaveBeenCalled();
        });

        it.each(["empresa", "administrador"])("conta de %s: não se aplica", async (tipoUsuario) => {
            const situacao = await AutenticacaoService.situacaoDaConta(conta({ tipoUsuario }));

            expect(situacao.dadosPessoaisPendentes).toBe(false);
            expect(Candidato.findOne).not.toHaveBeenCalled();
        });
    });
});

describe("montarSessao", () => {
    it("entrega ao Site temSenha e dadosPessoaisPendentes, sem o hash", async () => {
        const sessao = await AutenticacaoService.montarSessao(conta({ senhaHash: null }));

        expect(sessao.usuario).toMatchObject({ temSenha: false, dadosPessoaisPendentes: false });
        expect(sessao.usuario).not.toHaveProperty("senhaHash");
    });
});
