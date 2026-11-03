import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/**
 * A parte do `AutenticacaoService` que o login e o cadastro com Google usam: ler o código de
 * entrega no cadastro (`vinculoGoogle`), criar a conta (`cadastrarCandidato`) e os portões comuns
 * ao login por senha e ao do Google (`entrarComUsuario`).
 *
 * Sem banco real: modelos, transação e serviços colaboradores são simulados, como em
 * `RecuperacaoSenhaService.test.js`. `jsonwebtoken` e `ErroApi` ficam reais.
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

vi.mock("../utils/bcrypt.js", () => ({
    gerarHashSenha: vi.fn(async (senha) => `hash:${senha}`),
    compararSenha: vi.fn()
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
    modeloConfirmacaoTrocaEmail: vi.fn(),
    modeloSenhaAlterada: vi.fn()
}));
vi.mock("../utils/urlFrontend.js", () => ({ montarUrlFrontend: vi.fn(() => "https://site.exemplo/x") }));

const { Usuario, Candidato, CodigoVerificacaoEmail } = await import("../models/index.js");
const { compararSenha } = await import("../utils/bcrypt.js");
const { default: SessaoService } = await import("./SessaoService.js");
const { default: EmailService } = await import("./EmailService.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");
const { assinarCodigoDeEntrega, assinarProva } = await import("../utils/codigoGoogle.js");

const PERFIL_GOOGLE = { sub: "sub-do-google-1", email: "ana@exemplo.com", emailVerificado: true, nome: "Ana Souza" };

/** A prova que `GoogleAuthController.concluir` entrega ao Site e o Site reenvia no cadastro (`googleCodigo`). */
const codigoDoGoogle = (perfil = PERFIL_GOOGLE, opcoes = null) =>
    opcoes
        ? jwt.sign({ perfil }, SEGREDO, { audience: "acesso:google:prova", ...opcoes })
        : assinarProva(perfil);

const dadosDoCadastro = (extra = {}) => ({
    nome: "Ana Souza",
    email: "ana@exemplo.com",
    senha: "Senha@1234",
    telefone: "11999999999",
    cpf: "12345678901",
    pais: "br",
    dataNascimento: "1990-05-10",
    cidade: "São Paulo",
    estado: "sp",
    termosVersao: "2026-10-09",
    ...extra
});

const usuarioCriado = (dados) => ({ id: "u-novo", ...dados, toJSON: () => ({ id: "u-novo", ...dados }) });

beforeEach(() => {
    vi.clearAllMocks();
    Usuario.findOne.mockResolvedValue(null);
    Candidato.findOne.mockResolvedValue(null);
    Usuario.create.mockImplementation(async (dados) => usuarioCriado(dados));
    Candidato.create.mockResolvedValue({ id: "c-novo" });
    SessaoService.emitir.mockResolvedValue({ refreshToken: "refresh-de-teste" });
});

/** Os campos com que o `Usuario` foi criado. */
const camposGravados = () => Usuario.create.mock.calls[0][0];

describe("vinculoGoogle", () => {
    it("sem prova, é um cadastro comum e não vincula nada", () => {
        expect(AutenticacaoService.vinculoGoogle(undefined)).toBeNull();
        expect(AutenticacaoService.vinculoGoogle("")).toBeNull();
    });

    it("devolve o sub, o e-mail e se o Google o verificou, tudo da prova que este servidor assinou", () => {
        expect(AutenticacaoService.vinculoGoogle(codigoDoGoogle())).toEqual({
            googleId: "sub-do-google-1",
            email: "ana@exemplo.com",
            emailVerificado: true,
            nome: "Ana Souza"
        });
    });

    it.each([[undefined], [false], ["true"]])("só vale como verificado o emailVerificado exatamente true (recebeu %j)", (valor) => {
        const codigo = codigoDoGoogle({ ...PERFIL_GOOGLE, emailVerificado: valor });
        expect(AutenticacaoService.vinculoGoogle(codigo).emailVerificado).toBe(false);
    });

    it("recusa código expirado com 400", () => {
        const expirado = codigoDoGoogle(PERFIL_GOOGLE, { expiresIn: -10 });
        expect(() => AutenticacaoService.vinculoGoogle(expirado)).toThrowError(expect.objectContaining({ statusCode: 400 }));
    });

    it("recusa prova assinada por outro segredo (alguém tentando alegar um sub)", () => {
        const falso = jwt.sign({ perfil: PERFIL_GOOGLE }, "outro-segredo-qualquer-com-bastante-tamanho", {
            expiresIn: 900,
            audience: "acesso:google:prova"
        });
        expect(() => AutenticacaoService.vinculoGoogle(falso)).toThrowError(expect.objectContaining({ statusCode: 400 }));
    });

    it("recusa um JWT válido que não é prova (access token, sem perfil.sub nem audience)", () => {
        const acesso = jwt.sign({ id: "u1", tipoUsuario: "candidato" }, SEGREDO, { expiresIn: 60 });
        expect(() => AutenticacaoService.vinculoGoogle(acesso)).toThrowError(expect.objectContaining({ statusCode: 400 }));
    });

    // O código de entrega vai na URL de retorno do Google; a prova, não. Se um valesse pelo outro, quem
    // visse o endereço de retorno poderia usá-lo diretamente no cadastro.
    it("não aceita o código de entrega do retorno do Google no lugar da prova (achado 3)", () => {
        const codigoDeEntrega = assinarCodigoDeEntrega({
            perfil: PERFIL_GOOGLE,
            tipoConta: null,
            vinculo: "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0"
        });
        expect(() => AutenticacaoService.vinculoGoogle(codigoDeEntrega)).toThrowError(expect.objectContaining({ statusCode: 400 }));
    });
});

describe("cadastrarCandidato sem Google", () => {
    it("cria conta de candidato e devolve a sessão", async () => {
        const resultado = await AutenticacaoService.cadastrarCandidato(dadosDoCadastro());

        expect(camposGravados()).toMatchObject({ tipoUsuario: "candidato", email: "ana@exemplo.com", senhaHash: "hash:Senha@1234" });
        expect(camposGravados().googleId).toBeUndefined();
        expect(resultado).toMatchObject({ token: expect.any(String), refreshToken: "refresh-de-teste" });
        expect(transacao.commit).toHaveBeenCalled();
    });

    it("grava o e-mail como não verificado: o cadastro não prova que a pessoa tem a caixa de entrada", async () => {
        await AutenticacaoService.cadastrarCandidato(dadosDoCadastro());
        expect(camposGravados().emailVerificado).toBe(false);
    });

    it("ignora um tipoUsuario enviado no corpo: o papel nasce fixo no código", async () => {
        await AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ tipoUsuario: "administrador" }));
        expect(camposGravados().tipoUsuario).toBe("candidato");
    });

    it("recusa e-mail já cadastrado com 409, sem criar nada", async () => {
        Usuario.findOne.mockResolvedValue({ id: "existente" });
        await expect(AutenticacaoService.cadastrarCandidato(dadosDoCadastro())).rejects.toMatchObject({ statusCode: 409 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("recusa CPF já cadastrado com 409, sem criar nada", async () => {
        Candidato.findOne.mockResolvedValue({ id: "c-existente" });
        await expect(AutenticacaoService.cadastrarCandidato(dadosDoCadastro())).rejects.toMatchObject({ statusCode: 409 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });
});

describe("cadastrarCandidato com Google", () => {
    it("vincula o sub do Google à conta criada", async () => {
        await AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ googleCodigo: codigoDoGoogle() }));
        expect(camposGravados().googleId).toBe("sub-do-google-1");
    });

    it("continua criando candidato, mesmo com Google", async () => {
        await AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ googleCodigo: codigoDoGoogle() }));
        expect(camposGravados().tipoUsuario).toBe("candidato");
    });

    it("recusa prova inválida, sem criar nada", async () => {
        await expect(AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ googleCodigo: "lixo" }))).rejects.toMatchObject({ statusCode: 400 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("aceita o e-mail do formulário na forma canônica quando o Google o informa com ponto", async () => {
        // O validador do cadastro grava `maria.silva@gmail.com` como `mariasilva@gmail.com`.
        const perfil = { ...PERFIL_GOOGLE, email: "maria.silva@gmail.com" };
        await AutenticacaoService.cadastrarCandidato(
            dadosDoCadastro({ email: "mariasilva@gmail.com", googleCodigo: codigoDoGoogle(perfil) })
        );
        expect(camposGravados().googleId).toBe("sub-do-google-1");
        expect(camposGravados().emailVerificado).toBe(true);
    });

    it("aceita o e-mail igual ao do Google mesmo com diferença de maiúsculas e espaços", async () => {
        const perfil = { ...PERFIL_GOOGLE, email: "Ana@Exemplo.com" };
        await expect(
            AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ email: " ana@exemplo.com ", googleCodigo: codigoDoGoogle(perfil) }))
        ).resolves.toBeTruthy();
    });

    it("não envia o e-mail de confirmação: com Google o endereço já chega verificado", async () => {
        EmailService.disponivel.mockReturnValue(true);
        await AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ googleCodigo: codigoDoGoogle() }));
        expect(CodigoVerificacaoEmail.create).not.toHaveBeenCalled();
    });

    it("sem Google, continua enviando o e-mail de confirmação quando o provedor está configurado", async () => {
        EmailService.disponivel.mockReturnValue(true);
        await AutenticacaoService.cadastrarCandidato(dadosDoCadastro());
        expect(CodigoVerificacaoEmail.create).toHaveBeenCalled();
    });

    it("recusa o cadastro quando a prova não traz e-mail", async () => {
        const semEmail = codigoDoGoogle({ ...PERFIL_GOOGLE, email: null });
        await expect(AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ googleCodigo: semEmail }))).rejects.toMatchObject({
            statusCode: 400
        });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("confere o e-mail antes de consultar o banco, para não revelar se o endereço já existe", async () => {
        Usuario.findOne.mockResolvedValue({ id: "existente" });
        const erro = await AutenticacaoService.cadastrarCandidato(
            dadosDoCadastro({ email: "vitima@exemplo.com", googleCodigo: codigoDoGoogle() })
        ).catch((e) => e);

        expect(erro.statusCode).toBe(400);
        expect(erro.message).not.toMatch(/já está cadastrado/);
        expect(Usuario.findOne).not.toHaveBeenCalled();
    });

    // Achado 1 da auditoria (pré-sequestro de e-mail): o e-mail do cadastro tem de ser o que o
    // Google verificou.
    it("grava o e-mail como verificado quando o Google o verificou e é o mesmo do cadastro (achados 1 e 10)", async () => {
        await AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ googleCodigo: codigoDoGoogle() }));
        expect(camposGravados().emailVerificado).toBe(true);
    });

    it("recusa o cadastro quando o e-mail do formulário não é o que o Google verificou (achado 1)", async () => {
        await expect(
            AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ email: "vitima@exemplo.com", googleCodigo: codigoDoGoogle() }))
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });

    it("recusa o cadastro quando o Google não verificou o e-mail (achado 1)", async () => {
        const naoVerificado = codigoDoGoogle({ ...PERFIL_GOOGLE, emailVerificado: false });
        await expect(
            AutenticacaoService.cadastrarCandidato(dadosDoCadastro({ googleCodigo: naoVerificado }))
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(Usuario.create).not.toHaveBeenCalled();
    });
});

describe("conferirSenhaAtual (reautenticação antes de vincular ou desvincular o Google)", () => {
    const comSenha = { findByPk: vi.fn() };

    beforeEach(() => {
        Usuario.scope.mockReturnValue(comSenha);
        comSenha.findByPk.mockResolvedValue({ id: "u1", senhaHash: "hash-da-senha" });
    });

    it("aceita a senha certa", async () => {
        compararSenha.mockResolvedValue(true);

        await expect(AutenticacaoService.conferirSenhaAtual("u1", "Senha@1234")).resolves.toBeUndefined();
        expect(compararSenha).toHaveBeenCalledWith("Senha@1234", "hash-da-senha");
    });

    it("recusa a senha errada com 403, e não 401, para o Site não tratar como sessão vencida", async () => {
        compararSenha.mockResolvedValue(false);

        await expect(AutenticacaoService.conferirSenhaAtual("u1", "errada")).rejects.toMatchObject({
            statusCode: 403,
            message: "Senha incorreta."
        });
    });

    it.each([[undefined], [null], [""], [1234]])("recusa a senha %j sem nem comparar", async (senha) => {
        await expect(AutenticacaoService.conferirSenhaAtual("u1", senha)).rejects.toMatchObject({ statusCode: 403 });
        expect(compararSenha).not.toHaveBeenCalled();
    });

    it("conta sem senha: diz o que fazer (409 SEM_SENHA), e não um \"senha incorreta\" que não faria sentido", async () => {
        comSenha.findByPk.mockResolvedValue({ id: "u1", senhaHash: null });

        await expect(AutenticacaoService.conferirSenhaAtual("u1", "qualquer")).rejects.toMatchObject({
            statusCode: 409,
            detalhes: { codigo: "SEM_SENHA" }
        });
        expect(compararSenha).not.toHaveBeenCalled();
    });

    it("recusa com 404 o usuário que não existe", async () => {
        comSenha.findByPk.mockResolvedValue(null);

        await expect(AutenticacaoService.conferirSenhaAtual("u1", "Senha@1234")).rejects.toMatchObject({ statusCode: 404 });
    });
});

describe("entrarComUsuario (portões comuns ao login por senha e ao do Google)", () => {
    const contaBase = (extra = {}) => ({
        id: "u1",
        tipoUsuario: "candidato",
        ativo: true,
        bloqueado: false,
        emailVerificado: false,
        pausadoPeloUsuario: false,
        save: vi.fn(),
        toJSON() {
            return { id: this.id, tipoUsuario: this.tipoUsuario };
        },
        ...extra
    });

    it("emite a sessão e registra o último login de uma conta normal", async () => {
        const conta = contaBase();
        const resultado = await AutenticacaoService.entrarComUsuario(conta, { ip: "10.0.0.1" });

        expect(resultado).toMatchObject({ token: expect.any(String), refreshToken: "refresh-de-teste" });
        expect(conta.ultimoLogin).toBeInstanceOf(Date);
        expect(conta.save).toHaveBeenCalled();
        // Sem segundo fator nesta sessão, a verificação (mfaVerificadoEm) segue nula.
        expect(SessaoService.emitir).toHaveBeenCalledWith("u1", { ip: "10.0.0.1" }, { mfaVerificadoEm: null });
    });

    it("recusa conta desativada com 403", async () => {
        await expect(AutenticacaoService.entrarComUsuario(contaBase({ ativo: false }))).rejects.toMatchObject({ statusCode: 403 });
    });

    it("recusa conta bloqueada com 403 e inclui o motivo", async () => {
        const erro = await AutenticacaoService.entrarComUsuario(contaBase({ bloqueado: true, motivoBloqueio: "spam" })).catch((e) => e);
        expect(erro.statusCode).toBe(403);
        expect(erro.message).toContain("spam");
    });

    it("não emite sessão para conta recusada", async () => {
        await AutenticacaoService.entrarComUsuario(contaBase({ bloqueado: true })).catch(() => {});
        expect(SessaoService.emitir).not.toHaveBeenCalled();
    });

    it("devolve contaPausada, sem sessão, enquanto a reativação não é confirmada", async () => {
        const conta = contaBase({ pausadoPeloUsuario: true });
        await expect(AutenticacaoService.entrarComUsuario(conta)).resolves.toEqual({ contaPausada: true });
        expect(SessaoService.emitir).not.toHaveBeenCalled();
    });

    it("reativa a conta pausada quando a reativação é confirmada", async () => {
        const conta = contaBase({ pausadoPeloUsuario: true, pausadoEm: new Date() });
        const resultado = await AutenticacaoService.entrarComUsuario(conta, {}, true);

        expect(resultado.token).toEqual(expect.any(String));
        expect(conta.pausadoPeloUsuario).toBe(false);
        expect(conta.pausadoEm).toBeNull();
    });

    it("deixa candidato com e-mail não verificado entrar", async () => {
        const resultado = await AutenticacaoService.entrarComUsuario(contaBase({ emailVerificado: false }));
        expect(resultado.token).toEqual(expect.any(String));
    });

    it("segura empresa com e-mail não verificado, sem sessão", async () => {
        const conta = contaBase({ tipoUsuario: "empresa", emailVerificado: false, email: "rh@empresa.com" });
        await expect(AutenticacaoService.entrarComUsuario(conta)).resolves.toEqual({
            emailNaoVerificado: true,
            email: "rh@empresa.com"
        });
        expect(SessaoService.emitir).not.toHaveBeenCalled();
    });
});
