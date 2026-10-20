import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * O aviso de bloqueio de conta sai no idioma da conta bloqueada — nunca no do administrador que
 * está moderando. Sem banco real; o modelo de e-mail não é mockado, e `tentarAvisarPorEmail`
 * é capturado para ler o assunto que de fato seria enviado.
 */

vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn() } }));

vi.mock("../models/index.js", () => ({
    Usuario: { findByPk: vi.fn() },
    Empresa: {},
    Candidato: {},
    Postagem: {},
    PostagemAnexo: {},
    Denuncia: {}
}));

vi.mock("./NotificacaoService.js", () => ({ default: { criar: vi.fn() } }));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: vi.fn() } }));
vi.mock("./ArmazenamentoService.js", () => ({ default: {} }));
vi.mock("../utils/avisoEmail.js", () => ({ tentarAvisarPorEmail: vi.fn() }));

const { Usuario } = await import("../models/index.js");
const { tentarAvisarPorEmail } = await import("../utils/avisoEmail.js");
const { default: NotificacaoService } = await import("./NotificacaoService.js");
const { executarComIdioma } = await import("../i18n/idioma.js");
const { default: AdminUsuarioService } = await import("./AdminUsuarioService.js");

const ADMIN = { id: "admin1", tipoUsuario: "administrador" };

function contaAlvo(idioma) {
    return {
        id: "u2",
        nome: "Beto",
        email: "beto@exemplo.com",
        tipoUsuario: "candidato",
        bloqueado: false,
        ativo: true,
        idioma,
        update: vi.fn(async function (campos) {
            Object.assign(this, campos);
        })
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("aviso de bloqueio de conta", () => {
    it.each([
        ["pt", "Sua conta foi bloqueada — ACESSO"],
        ["en", "Your account was blocked — ACESSO"],
        ["es", "Tu cuenta fue bloqueada — ACESSO"]
    ])("conta em %s recebe o e-mail em %s", async (idioma, assunto) => {
        Usuario.findByPk.mockResolvedValue(contaAlvo(idioma));

        await AdminUsuarioService.alternarBloqueio("u2", { bloqueado: true, motivo: "Spam" }, ADMIN);

        const { template } = tentarAvisarPorEmail.mock.calls[0][0];
        expect(template.assunto).toBe(assunto);
        expect(template.texto).toContain("Spam");
    });

    it("administrador moderando em espanhol não muda a língua do e-mail de quem foi bloqueado", async () => {
        Usuario.findByPk.mockResolvedValue(contaAlvo("en"));

        await executarComIdioma(
            "es",
            () => AdminUsuarioService.alternarBloqueio("u2", { bloqueado: true }, ADMIN),
            { explicito: true }
        );

        expect(tentarAvisarPorEmail.mock.calls[0][0].template.assunto).toBe("Your account was blocked — ACESSO");
    });

    it("a notificação dentro do app continua gravada em português (é traduzida na leitura)", async () => {
        Usuario.findByPk.mockResolvedValue(contaAlvo("en"));

        await AdminUsuarioService.alternarBloqueio("u2", { bloqueado: true, motivo: "Spam" }, ADMIN);

        expect(NotificacaoService.criar).toHaveBeenCalledWith(
            expect.objectContaining({
                titulo: "Conta bloqueada",
                descricao: "Sua conta foi bloqueada. Motivo: Spam."
            })
        );
    });

    it("reativar não manda e-mail", async () => {
        Usuario.findByPk.mockResolvedValue({ ...contaAlvo("en"), bloqueado: true, ativo: false });

        await AdminUsuarioService.alternarBloqueio("u2", { bloqueado: false }, ADMIN);

        expect(tentarAvisarPorEmail).not.toHaveBeenCalled();
    });
});
