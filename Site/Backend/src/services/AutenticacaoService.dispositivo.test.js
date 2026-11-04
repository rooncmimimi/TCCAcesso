import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * O portão de dispositivo novo no login (Bloco 3): a senha (ou o Google) sozinha não abre sessão num aparelho que o Site ainda não
 * confirmou, e o recurso desligado (ou sem e-mail) deixa o login exatamente como era. O banco e
 * os serviços vizinhos são simulados; o ponta a ponta real é a rodada funcional descrita em
 * `Site/docs/dispositivos-e-conta-comprometida.md`.
 */

vi.mock("../config/env.js", () => ({
    default: { jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres", expiresIn: "30m" } }
}));

const { sessoes, dispositivos, eventos } = vi.hoisted(() => ({
    sessoes: { emitir: vi.fn(), revogarTodos: vi.fn() },
    dispositivos: {
        disponivel: vi.fn(),
        habilitado: vi.fn(),
        exigirHabilitado: vi.fn(),
        reconhecido: vi.fn(),
        iniciarVerificacao: vi.fn(),
        confirmar: vi.fn(),
        confiar: vi.fn(),
        notificarNovoAcesso: vi.fn(),
        revogarTodos: vi.fn()
    },
    eventos: { registrar: vi.fn() }
}));

vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn() } }));
vi.mock("../models/index.js", () => ({
    Usuario: { findOne: vi.fn(), findByPk: vi.fn(), create: vi.fn(), scope: vi.fn() },
    Candidato: { findOne: vi.fn(), create: vi.fn() },
    Empresa: { findOne: vi.fn(), create: vi.fn() },
    CodigoVerificacaoEmail: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() }
}));
vi.mock("../utils/bcrypt.js", () => ({ gerarHashSenha: vi.fn(), compararSenha: vi.fn() }));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: vi.fn() } }));
vi.mock("./SessaoService.js", () => ({ default: sessoes }));
vi.mock("./DispositivoConfiavelService.js", () => ({ default: dispositivos }));
vi.mock("./SegurancaEventosService.js", () => ({ default: eventos }));
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

const { Usuario, Candidato, Empresa } = await import("../models/index.js");
const { default: AutenticacaoService } = await import("./AutenticacaoService.js");

const conta = (extra = {}) => ({
    id: "u1",
    nome: "Ana",
    email: "ana@exemplo.com",
    tipoUsuario: "candidato",
    ativo: true,
    bloqueado: false,
    emailVerificado: true,
    pausadoPeloUsuario: false,
    cadastroConcluidoEm: new Date(),
    senhaHash: "hash",
    save: vi.fn(),
    toJSON() {
        return { id: this.id, tipoUsuario: this.tipoUsuario };
    },
    ...extra
});

const VERIFICACAO = { verificacaoDispositivo: true, desafioDispositivo: "jwt-do-desafio", emailMascarado: "an***@exemplo.com" };

beforeEach(() => {
    vi.resetAllMocks();
    sessoes.emitir.mockResolvedValue({ refreshToken: "refresh-de-teste" });
    dispositivos.disponivel.mockReturnValue(true);
    dispositivos.habilitado.mockReturnValue(true);
    dispositivos.reconhecido.mockResolvedValue(false);
    dispositivos.iniciarVerificacao.mockResolvedValue(VERIFICACAO);
    Candidato.findOne.mockResolvedValue({ pais: "BR", dataNascimento: "1990-01-01", cidade: "SP", estado: "SP", cpfHash: "h" });
    Empresa.findOne.mockResolvedValue(null);
});

describe("entrarComUsuario num dispositivo que o Site não reconhece", () => {
    it("não emite sessão nem token: devolve o desafio por e-mail", async () => {
        const r = await AutenticacaoService.entrarComUsuario(conta(), { ip: "1.1.1.1", dispositivo: "token-desconhecido" });

        expect(r).toEqual(VERIFICACAO);
        expect(r.token).toBeUndefined();
        expect(sessoes.emitir).not.toHaveBeenCalled();
        expect(dispositivos.reconhecido).toHaveBeenCalledWith("u1", "token-desconhecido");
    });

    it("a escolha de reativação da conta pausada segue junto no desafio", async () => {
        await AutenticacaoService.entrarComUsuario(conta({ pausadoPeloUsuario: true }), { ip: "1.1.1.1" }, true);

        expect(dispositivos.iniciarVerificacao).toHaveBeenCalledWith(expect.anything(), { ip: "1.1.1.1" }, { confirmarReativacao: true });
    });

    it("conta pausada não revela o estado antes do código", async () => {
        const r = await AutenticacaoService.entrarComUsuario(conta({ pausadoPeloUsuario: true }), {});

        expect(r.verificacaoDispositivo).toBe(true);
        expect(r.contaPausada).toBeUndefined();
    });

    it("conta bloqueada ou desativada continua recusada ANTES de qualquer código ser enviado", async () => {
        await expect(AutenticacaoService.entrarComUsuario(conta({ bloqueado: true }), {})).rejects.toMatchObject({ statusCode: 403 });
        await expect(AutenticacaoService.entrarComUsuario(conta({ ativo: false }), {})).rejects.toMatchObject({ statusCode: 403 });

        expect(dispositivos.iniciarVerificacao).not.toHaveBeenCalled();
    });

    it("e-mail não verificado de empresa continua sendo respondido como antes (sem gastar um código)", async () => {
        const r = await AutenticacaoService.entrarComUsuario(conta({ tipoUsuario: "empresa", emailVerificado: false }), {});

        expect(r.emailNaoVerificado).toBe(true);
        expect(dispositivos.iniciarVerificacao).not.toHaveBeenCalled();
    });
});

describe("quando o portão NÃO se aplica", () => {
    it("aparelho reconhecido: entra direto", async () => {
        dispositivos.reconhecido.mockResolvedValue(true);

        const r = await AutenticacaoService.entrarComUsuario(conta(), { dispositivo: "token-conhecido" });

        expect(r.token).toBeDefined();
        expect(dispositivos.iniciarVerificacao).not.toHaveBeenCalled();
    });

    it("recurso desligado ou sem e-mail (disponivel = false): o login é o de sempre e o banco do recurso nem é consultado", async () => {
        dispositivos.disponivel.mockReturnValue(false);

        const r = await AutenticacaoService.entrarComUsuario(conta(), {});

        expect(r.token).toBeDefined();
        expect(dispositivos.reconhecido).not.toHaveBeenCalled();
        expect(dispositivos.iniciarVerificacao).not.toHaveBeenCalled();
    });

    it("depois do código do e-mail, o portão não se repete", async () => {
        const r = await AutenticacaoService.entrarComUsuario(conta(), {}, false, { dispositivoVerificado: true });

        expect(r.token).toBeDefined();
        expect(dispositivos.iniciarVerificacao).not.toHaveBeenCalled();
    });
});

describe("concluirLoginComDispositivo", () => {
    beforeEach(() => {
        dispositivos.confirmar.mockResolvedValue({ usuarioId: "u1", confirmarReativacao: false });
        Usuario.findByPk.mockResolvedValue(conta());
    });

    it("código certo: abre a sessão, registra o evento e avisa do novo acesso", async () => {
        const r = await AutenticacaoService.concluirLoginComDispositivo("desafio", "123456", {}, { ip: "1.1.1.1" });

        expect(dispositivos.confirmar).toHaveBeenCalledWith("desafio", "123456");
        expect(r.token).toBeDefined();
        expect(r.dispositivo).toBeUndefined();
        expect(eventos.registrar).toHaveBeenCalledWith("u1", "dispositivo_novo_confirmado", { ip: "1.1.1.1" });
        expect(dispositivos.notificarNovoAcesso).toHaveBeenCalledOnce();
    });

    it("sem `lembrar`, o aparelho NÃO vira de confiança; com `lembrar`, o token do aparelho sai na resposta", async () => {
        await AutenticacaoService.concluirLoginComDispositivo("d", "123456", { lembrar: false }, {});
        expect(dispositivos.confiar).not.toHaveBeenCalled();

        dispositivos.confiar.mockResolvedValue("token-do-aparelho");

        const r = await AutenticacaoService.concluirLoginComDispositivo("d", "123456", { lembrar: true }, {});

        expect(r.dispositivo).toBe("token-do-aparelho");
    });

    it("código errado ou expirado: nenhuma sessão", async () => {
        dispositivos.confirmar.mockRejectedValue(Object.assign(new Error("errado"), { statusCode: 400 }));

        await expect(AutenticacaoService.concluirLoginComDispositivo("d", "000000", {}, {})).rejects.toMatchObject({ statusCode: 400 });
        expect(sessoes.emitir).not.toHaveBeenCalled();
    });

    it("recurso desligado: 503 antes de qualquer conferência", async () => {
        dispositivos.exigirHabilitado.mockImplementation(() => {
            throw Object.assign(new Error("indisponível"), { statusCode: 503 });
        });

        await expect(AutenticacaoService.concluirLoginComDispositivo("d", "123456", {}, {})).rejects.toMatchObject({ statusCode: 503 });
        expect(dispositivos.confirmar).not.toHaveBeenCalled();
    });

    it("conta que deixou de existir entre os dois passos: tratado como verificação vencida", async () => {
        Usuario.findByPk.mockResolvedValue(null);

        await expect(AutenticacaoService.concluirLoginComDispositivo("d", "123456", {}, {})).rejects.toMatchObject({
            detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" }
        });
    });

    it("conta pausada sem confirmar a reativação: devolve o aviso de pausa, sem lembrar nem avisar do acesso", async () => {
        Usuario.findByPk.mockResolvedValue(conta({ pausadoPeloUsuario: true }));

        const r = await AutenticacaoService.concluirLoginComDispositivo("d", "123456", { lembrar: true }, {});

        expect(r.contaPausada).toBe(true);
        expect(dispositivos.confiar).not.toHaveBeenCalled();
        expect(dispositivos.notificarNovoAcesso).not.toHaveBeenCalled();
    });

    it("uma falha em avisar do novo acesso não derruba o login", async () => {
        dispositivos.notificarNovoAcesso.mockRejectedValue(new Error("fora do ar"));

        await expect(AutenticacaoService.concluirLoginComDispositivo("d", "123456", {}, {})).resolves.toMatchObject({ token: expect.any(String) });
    });
});
