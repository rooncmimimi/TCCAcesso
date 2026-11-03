import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/**
 * Criar a conta de candidato direto do retorno do Google, sem senha (etapa 6 da auditoria). O que se
 * garante: tudo que vale vem da prova que o servidor assinou, o e-mail tem de ser o que o Google
 * verificou, o aceite dos termos é condição e fica registrado, e a conta nasce sem senha, com Google,
 * e com os dados pessoais pendentes.
 *
 * Sem banco real: modelos, transação e colaboradores são simulados, como em
 * `AutenticacaoService.google.test.js`. `jsonwebtoken` e `ErroApi` ficam reais.
 */

const SEGREDO = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

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

vi.mock("../utils/bcrypt.js", () => ({ gerarHashSenha: vi.fn(), compararSenha: vi.fn() }));
vi.mock("./SessaoService.js", () => ({
    default: { emitir: vi.fn(async () => ({ refreshToken: "refresh-de-teste" })), revogarTodos: vi.fn() }
}));
vi.mock("./EmailService.js", () => ({ default: { disponivel: vi.fn(() => true), enviar: vi.fn() } }));
vi.mock("./NotificacaoService.js", () => ({ default: { criar: vi.fn() } }));
vi.mock("./NotificacaoPushService.js", () => ({ default: { removerTodosDoUsuario: vi.fn() } }));
vi.mock("./AdminUsuarioService.js", () => ({ default: { excluirContaDefinitivamente: vi.fn() } }));
vi.mock("../utils/modelosEmail.js", () => ({
    modeloConfirmacaoCadastro: vi.fn(),
    modeloConfirmacaoTrocaEmail: vi.fn(),
    modeloSenhaAlterada: vi.fn()
}));
vi.mock("../utils/urlFrontend.js", () => ({ montarUrlFrontend: vi.fn(() => "https://site.exemplo/x") }));

const { Usuario, Candidato, CodigoVerificacaoEmail } = await import("../models/index.js");
const { gerarHashSenha } = await import("../utils/bcrypt.js");
const { default: EmailService } = await import("./EmailService.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");
const { assinarProva } = await import("../utils/codigoGoogle.js");

const PERFIL = { sub: "sub-do-google-1", email: "ana@exemplo.com", emailVerificado: true, nome: "Ana Souza" };
const TERMOS = "2026-10-09";

const criar = (perfil = PERFIL, termosVersao = TERMOS) =>
    AutenticacaoService.cadastrarCandidatoComGoogle({ prova: assinarProva(perfil), termosVersao }, { ip: "10.0.0.1" });

/** Os campos com que o `Usuario` foi criado. */
const camposGravados = () => Usuario.create.mock.calls[0][0];

beforeEach(() => {
    vi.resetAllMocks();
    transacao.commit.mockResolvedValue(undefined);
    Usuario.findOne.mockResolvedValue(null);
    Usuario.create.mockImplementation(async (dados) => ({
        id: "u-novo",
        ...dados,
        toJSON() {
            return { id: "u-novo", ...dados };
        }
    }));
    Candidato.create.mockResolvedValue({ id: "c-novo" });
    // A conta nova ainda não tem nenhum dado pessoal.
    Candidato.findOne.mockResolvedValue({ cpfHash: null, dataNascimento: null, cidade: null, estado: null, pais: null });
    EmailService.disponivel.mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a conta que nasce", () => {
    it("é de candidato, sem senha, com o Google vinculado e o e-mail já verificado", async () => {
        await criar();

        expect(camposGravados()).toMatchObject({
            tipoUsuario: "candidato",
            senhaHash: null,
            googleId: "sub-do-google-1",
            emailVerificado: true,
            email: "ana@exemplo.com"
        });
    });

    it("nunca gera nem grava uma senha", async () => {
        await criar();

        expect(gerarHashSenha).not.toHaveBeenCalled();
        expect(camposGravados().senhaHash).toBeNull();
    });

    it("usa o nome que o Google informou", async () => {
        await criar();
        expect(camposGravados().nome).toBe("Ana Souza");
    });

    it("registra o aceite dos termos: a versão que a tela mostrou e o momento, que é do servidor", async () => {
        await criar();

        expect(camposGravados().termosVersao).toBe(TERMOS);
        expect(camposGravados().termosAceitosEm).toBeInstanceOf(Date);
    });

    it("cria o perfil de candidato só com o vínculo (os dados pessoais ficam para depois), na mesma transação", async () => {
        await criar();

        expect(Candidato.create).toHaveBeenCalledWith({ usuarioId: "u-novo" }, expect.objectContaining({ transaction: transacao }));
        expect(transacao.commit).toHaveBeenCalledTimes(1);
        expect(transacao.rollback).not.toHaveBeenCalled();
    });

    it("não define cadastroConcluidoEm: o cadastro está só começando", async () => {
        await criar();
        expect(camposGravados()).not.toHaveProperty("cadastroConcluidoEm");
    });

    it("não manda e-mail de confirmação: o Google já verificou o endereço", async () => {
        await criar();

        expect(CodigoVerificacaoEmail.create).not.toHaveBeenCalled();
        expect(EmailService.enviar).not.toHaveBeenCalled();
    });
});

describe("a sessão que volta", () => {
    it("abre a sessão e diz ao Site que a conta não tem senha e que faltam os dados pessoais", async () => {
        const sessao = await criar();

        expect(sessao).toMatchObject({ token: expect.any(String), refreshToken: "refresh-de-teste" });
        expect(sessao.usuario).toMatchObject({ temSenha: false, dadosPessoaisPendentes: true });
        expect(sessao.usuario).not.toHaveProperty("senhaHash");
    });
});

describe("o e-mail", () => {
    it("vem só da prova, na forma canônica: o Google informa maria.silva@gmail.com e o banco guarda sem ponto", async () => {
        await criar({ ...PERFIL, email: "Maria.Silva@Gmail.com" });

        expect(camposGravados().email).toBe("mariasilva@gmail.com");
    });

    it("procura a conta existente pela forma canônica", async () => {
        await criar({ ...PERFIL, email: "maria.silva+acesso@gmail.com" });

        expect(Usuario.findOne).toHaveBeenCalledWith({ where: { email: "mariasilva@gmail.com" } });
    });

    it("recusa com 400 quando o Google não verificou o e-mail, sem criar nada", async () => {
        await expect(criar({ ...PERFIL, emailVerificado: false })).rejects.toMatchObject({ statusCode: 400 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("recusa com 400 quando a prova não traz e-mail", async () => {
        await expect(criar({ ...PERFIL, email: null })).rejects.toMatchObject({ statusCode: 400 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("recusa com 409 quando já existe conta com esse e-mail (a saída é entrar e vincular)", async () => {
        Usuario.findOne.mockResolvedValueOnce({ id: "existente" });

        await expect(criar()).rejects.toMatchObject({ statusCode: 409, message: "Este e-mail já está cadastrado." });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("recusa com 409 quando esse Google já está vinculado a outra conta", async () => {
        Usuario.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "outra" });

        await expect(criar()).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining("Google") });
        expect(Usuario.create).not.toHaveBeenCalled();
    });
});

describe("o nome", () => {
    it.each([[null], [""], ["Jo"], ["   "]])("quando o Google traz %j, usa a parte do e-mail antes do @", async (nome) => {
        await criar({ ...PERFIL, nome, email: "joana.silva@exemplo.com" });

        expect(camposGravados().nome).toBe("joana.silva");
    });

    it("se nem a parte do e-mail serve (curta demais), usa um nome padrão que o modelo aceita", async () => {
        await criar({ ...PERFIL, nome: null, email: "jo@exemplo.com" });

        expect(camposGravados().nome).toBe("Novo usuário");
        expect(camposGravados().nome.length).toBeGreaterThanOrEqual(3);
    });

    it("limita ao tamanho do modelo", async () => {
        await criar({ ...PERFIL, nome: "A".repeat(300) });

        expect(camposGravados().nome).toHaveLength(150);
    });
});

describe("o que é condição para criar", () => {
    it.each([[undefined], [null], [""]])("sem aceitar os termos (%j): 400, e nada é consultado nem criado", async (termos) => {
        await expect(
            AutenticacaoService.cadastrarCandidatoComGoogle({ prova: assinarProva(PERFIL), termosVersao: termos })
        ).rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringContaining("Termos de Uso")
        });
        expect(Usuario.findOne).not.toHaveBeenCalled();
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it.each([[undefined], [""]])("sem a prova (%j): 400", async (prova) => {
        await expect(AutenticacaoService.cadastrarCandidatoComGoogle({ prova, termosVersao: TERMOS })).rejects.toMatchObject({
            statusCode: 400
        });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("com uma prova inválida ou de outro tipo de token: 400", async () => {
        const falsa = jwt.sign({ perfil: PERFIL }, SEGREDO, { expiresIn: 60 }); // sem a audience da prova

        await expect(AutenticacaoService.cadastrarCandidatoComGoogle({ prova: falsa, termosVersao: TERMOS })).rejects.toMatchObject({
            statusCode: 400
        });
        await expect(AutenticacaoService.cadastrarCandidatoComGoogle({ prova: "lixo", termosVersao: TERMOS })).rejects.toMatchObject({
            statusCode: 400
        });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("com a prova vencida: 400 pedindo para entrar com o Google de novo", async () => {
        const vencida = jwt.sign({ perfil: PERFIL }, SEGREDO, { expiresIn: -10, audience: "acesso:google:prova" });

        await expect(AutenticacaoService.cadastrarCandidatoComGoogle({ prova: vencida, termosVersao: TERMOS })).rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringContaining("Google")
        });
    });
});

describe("falha no meio", () => {
    it("desfaz a transação e propaga o erro, sem conta pela metade", async () => {
        const falha = new Error("banco fora do ar");
        Candidato.create.mockRejectedValue(falha);

        await expect(criar()).rejects.toBe(falha);

        expect(transacao.rollback).toHaveBeenCalledTimes(1);
        expect(transacao.commit).not.toHaveBeenCalled();
    });
});
