import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Situação do cadastro: o que decide se o Site manda a pessoa de volta ao cadastro depois do login.
 *
 * Regra: cadastro **pendente** é cadastro com dado obrigatório faltando, e não "o último botão do
 * assistente não foi clicado". Antes, `cadastroConcluidoEm` nula bastava, e a conta criada sem país,
 * nascimento, cidade ou estado ficava num laço (retomada na etapa de perfil → conclusão recusada →
 * retomada no login seguinte).
 *
 * Sem banco real: modelos, transação e serviços colaboradores são simulados (mesmo padrão de
 * `AutenticacaoService.google.test.js`).
 */

vi.mock("../config/env.js", () => ({
    default: { jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres", expiresIn: "30m" } }
}));

const { transacao } = vi.hoisted(() => ({ transacao: { commit: vi.fn(), rollback: vi.fn() } }));

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
    modeloConfirmacaoCadastro: vi.fn(() => ({ assunto: "a", html: "h", texto: "t" })),
    modeloConfirmacaoTrocaEmail: vi.fn(),
    modeloSenhaAlterada: vi.fn()
}));
vi.mock("../utils/urlFrontend.js", () => ({ montarUrlFrontend: vi.fn(() => "https://site.exemplo/x") }));

const { Usuario, Candidato, Empresa } = await import("../models/index.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");

const COMPLETO = { pais: "BR", dataNascimento: "1990-05-20", cidade: "São Paulo", estado: "SP" };

const usuario = (extra = {}) => ({
    id: "u1",
    tipoUsuario: "candidato",
    cadastroConcluidoEm: null,
    toJSON() {
        return { id: this.id, tipoUsuario: this.tipoUsuario, cadastroConcluidoEm: this.cadastroConcluidoEm };
    },
    ...extra
});

beforeEach(() => {
    vi.resetAllMocks();
});

describe("situacaoDoCadastro", () => {
    it("candidato com os dados obrigatórios e sem a data de conclusão NÃO está pendente", () => {
        expect(AutenticacaoService.situacaoDoCadastro(usuario(), COMPLETO)).toEqual({
            cadastroPendente: false,
            dadosCadastroPendentes: []
        });
    });

    it("candidato sem país, nascimento, cidade e estado está pendente e a lista diz quais", () => {
        expect(AutenticacaoService.situacaoDoCadastro(usuario(), {})).toEqual({
            cadastroPendente: true,
            dadosCadastroPendentes: ["pais", "dataNascimento", "cidade", "estado"]
        });
    });

    it("lista só o que falta, e trata texto em branco como faltando", () => {
        const situacao = AutenticacaoService.situacaoDoCadastro(usuario(), { ...COMPLETO, cidade: "   ", pais: null });

        expect(situacao.cadastroPendente).toBe(true);
        expect(situacao.dadosCadastroPendentes).toEqual(["pais", "cidade"]);
    });

    it("sem perfil de candidato, tudo falta", () => {
        expect(AutenticacaoService.situacaoDoCadastro(usuario(), null).dadosCadastroPendentes).toHaveLength(4);
    });

    it("conta com a data de conclusão nunca é pendente, mesmo antiga e sem algum campo", () => {
        const antiga = usuario({ cadastroConcluidoEm: new Date("2026-01-01") });

        expect(AutenticacaoService.situacaoDoCadastro(antiga, { pais: null }).cadastroPendente).toBe(false);
    });

    it.each(["empresa", "administrador"])("%s nunca é pendente", (tipoUsuario) => {
        expect(AutenticacaoService.situacaoDoCadastro(usuario({ tipoUsuario }), null).cadastroPendente).toBe(false);
    });
});

describe("montarSessao e perfil carregam a situação do cadastro", () => {
    it("o login devolve cadastroPendente=false para candidato com os dados, mesmo sem a data de conclusão", async () => {
        Candidato.findOne.mockResolvedValue(COMPLETO);

        const { usuario: dados } = await AutenticacaoService.montarSessao(usuario());

        expect(dados.cadastroPendente).toBe(false);
        expect(dados.dadosCadastroPendentes).toEqual([]);
    });

    it("o login devolve cadastroPendente=true e os campos para o candidato que ficou sem dados", async () => {
        Candidato.findOne.mockResolvedValue({ pais: null, dataNascimento: null, cidade: null, estado: null });

        const { usuario: dados } = await AutenticacaoService.montarSessao(usuario());

        expect(dados.cadastroPendente).toBe(true);
        expect(dados.dadosCadastroPendentes).toEqual(["pais", "dataNascimento", "cidade", "estado"]);
    });

    it("empresa não consulta o candidato e não fica pendente", async () => {
        Empresa.findOne.mockResolvedValue({ id: "e1" });

        const { usuario: dados } = await AutenticacaoService.montarSessao(usuario({ tipoUsuario: "empresa" }));

        expect(Candidato.findOne).not.toHaveBeenCalled();
        expect(dados.cadastroPendente).toBe(false);
    });

    it("perfilAtualComSituacao junta a situação ao usuário que o /me devolve", async () => {
        const base = usuario({ candidato: { pais: null, dataNascimento: null, cidade: null, estado: null } });
        Usuario.findByPk.mockResolvedValue(base);

        const perfil = await AutenticacaoService.perfilAtualComSituacao("u1");

        expect(perfil.cadastroPendente).toBe(true);
        expect(perfil.id).toBe("u1");
    });
});

describe("concluirCadastro", () => {
    it("recusa com a lista de campos em português quando falta dado obrigatório", async () => {
        Usuario.findByPk.mockResolvedValue(usuario({ update: vi.fn() }));
        Candidato.findOne.mockResolvedValue({ pais: "BR", dataNascimento: null, cidade: "SP", estado: "" });

        await expect(AutenticacaoService.concluirCadastro("u1")).rejects.toThrow(
            "Para concluir o cadastro, preencha: data de nascimento, estado."
        );
    });

    it("grava a data de conclusão uma vez quando está tudo preenchido", async () => {
        const update = vi.fn();
        const base = usuario({ update, candidato: COMPLETO });
        Usuario.findByPk.mockResolvedValue(base);
        Candidato.findOne.mockResolvedValue(COMPLETO);

        await AutenticacaoService.concluirCadastro("u1");

        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith({ cadastroConcluidoEm: expect.any(Date) });
    });
});

describe("cadastro novo", () => {
    const dados = {
        nome: "Ana Souza",
        email: "ana@exemplo.com",
        senha: "Senha@1234",
        telefone: "11999999999",
        cpf: "52998224725",
        ...COMPLETO
    };

    it("candidato já nasce com o cadastro concluído: todos os obrigatórios chegam no mesmo POST", async () => {
        Usuario.findOne.mockResolvedValue(null);
        Candidato.findOne.mockResolvedValue(null);
        Usuario.create.mockImplementation(async (valores) => ({ ...usuario(), ...valores }));
        Candidato.create.mockResolvedValue({});

        await AutenticacaoService.cadastrarCandidato(dados);

        expect(Usuario.create.mock.calls[0][0].cadastroConcluidoEm).toBeInstanceOf(Date);
    });
});
