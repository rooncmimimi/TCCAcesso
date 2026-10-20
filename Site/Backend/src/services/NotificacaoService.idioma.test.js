import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * As notificações ficam gravadas em português e saem no idioma de quem lê: na listagem, no
 * tempo real e no push (esses dois no idioma da conta de quem recebe, nunca no de quem agiu).
 */

vi.mock("../models/index.js", () => ({
    Notificacao: { findAndCountAll: vi.fn(), findOne: vi.fn(), create: vi.fn(), findByPk: vi.fn(), count: vi.fn() },
    PreferenciaNotificacao: { findOne: vi.fn() },
    Usuario: { findByPk: vi.fn() }
}));

vi.mock("../realtime/socket.js", () => ({ emitirParaUsuario: vi.fn() }));
vi.mock("./NotificacaoPushService.js", () => ({ default: { enviarParaUsuario: vi.fn() } }));

const { Notificacao, Usuario, PreferenciaNotificacao } = await import("../models/index.js");
const { emitirParaUsuario } = await import("../realtime/socket.js");
const { default: NotificacaoPushService } = await import("./NotificacaoPushService.js");
const { executarComIdioma } = await import("../i18n/idioma.js");
const { default: NotificacaoService, notificacaoNoIdioma } = await import("./NotificacaoService.js");

const gravada = (extra = {}) => ({
    id: "n1",
    usuarioId: "u1",
    tipo: "feed",
    titulo: "Nova curtida na sua publicação",
    descricao: "Ana Souza curtiu sua publicação.",
    entidadeTipo: "postagem",
    entidadeId: "p1",
    lida: false,
    ator: { id: "u2", nome: "Ana Souza", fotoPerfil: null },
    toJSON() {
        const { toJSON, ...dados } = this;
        return dados;
    },
    ...extra
});

beforeEach(() => {
    vi.clearAllMocks();
    PreferenciaNotificacao.findOne.mockResolvedValue(null);
});

describe("notificacaoNoIdioma", () => {
    it("traduz título e texto e preserva o resto (inclusive o ator)", () => {
        const resultado = notificacaoNoIdioma(gravada(), "en");

        expect(resultado.titulo).toBe("New like on your post");
        expect(resultado.descricao).toBe("Ana Souza liked your post.");
        expect(resultado.ator).toEqual({ id: "u2", nome: "Ana Souza", fotoPerfil: null });
        expect(resultado.id).toBe("n1");
    });

    it("em português devolve o que está gravado", () => {
        const resultado = notificacaoNoIdioma(gravada(), "pt");

        expect(resultado.titulo).toBe("Nova curtida na sua publicação");
    });

    it("deixa como está o texto que a pessoa escreveu e a notificação sem descrição", () => {
        const mensagem = gravada({ titulo: "Nova mensagem recebida", descricao: "Ana: oi, tudo bem?" });
        const semTexto = gravada({ descricao: null });

        expect(notificacaoNoIdioma(mensagem, "es")).toMatchObject({
            titulo: "Nuevo mensaje recibido",
            descricao: "Ana: oi, tudo bem?"
        });
        expect(notificacaoNoIdioma(semTexto, "es").descricao).toBeNull();
    });

    it("traduz notificação antiga com status e título de vaga dentro da frase", () => {
        const antiga = gravada({
            titulo: "Sua candidatura foi atualizada",
            descricao: 'Sua candidatura para a vaga "Dev Backend" foi atualizada para Aprovada.'
        });

        expect(notificacaoNoIdioma(antiga, "es")).toMatchObject({
            titulo: "Tu candidatura fue actualizada",
            descricao: 'Tu candidatura a la vacante "Dev Backend" fue actualizada a Aprobada.'
        });
    });
});

describe("listagem", () => {
    it("sai no idioma da requisição", async () => {
        Notificacao.findAndCountAll.mockResolvedValue({ rows: [gravada()], count: 1 });

        const resposta = await NotificacaoService.listar({ id: "u1" }, {}, "es");

        expect(resposta.notificacoes[0].titulo).toBe("Nuevo me gusta en tu publicación");
        expect(resposta.total).toBe(1);
    });

    it("sem idioma explícito usa o do contexto da requisição", async () => {
        Notificacao.findAndCountAll.mockResolvedValue({ rows: [gravada()], count: 1 });

        const resposta = await executarComIdioma("en", () => NotificacaoService.listar({ id: "u1" }, {}));

        expect(resposta.notificacoes[0].titulo).toBe("New like on your post");
    });

    it("marcar como lida devolve a notificação no idioma pedido", async () => {
        const notificacao = gravada({ save: vi.fn() });
        Notificacao.findOne.mockResolvedValue(notificacao);

        const resposta = await NotificacaoService.marcarComoLida("n1", { id: "u1" }, "en");

        expect(notificacao.save).toHaveBeenCalled();
        expect(resposta.titulo).toBe("New like on your post");
        expect(resposta.lida).toBe(true);
    });
});

describe("tempo real e push", () => {
    const esperarEntrega = () => new Promise((resolve) => setImmediate(resolve));

    it("saem no idioma da conta de quem recebe, não no de quem agiu", async () => {
        Usuario.findByPk.mockResolvedValue({ idioma: "es" });

        // Quem curtiu usa o Site em inglês; quem foi curtido usa espanhol.
        executarComIdioma("en", () => NotificacaoService.emitirNotificacaoCriada(gravada(), 3), {
            explicito: true
        });
        await esperarEntrega();

        const [usuarioId, evento, carga] = emitirParaUsuario.mock.calls[0];
        expect(usuarioId).toBe("u1");
        expect(evento).toBe("notificacao:nova");
        expect(carga.naoLidas).toBe(3);
        expect(carga.notificacao.titulo).toBe("Nuevo me gusta en tu publicación");

        expect(NotificacaoPushService.enviarParaUsuario).toHaveBeenCalledWith(
            "u1",
            expect.objectContaining({
                titulo: "Nuevo me gusta en tu publicación",
                corpo: "A Ana Souza le gustó tu publicación.",
                dados: expect.objectContaining({ notificacaoId: "n1", entidadeId: "p1" })
            })
        );
    });

    it("conta inexistente ou falha ao consultar: sai em português, não derruba nada", async () => {
        Usuario.findByPk.mockRejectedValue(new Error("banco fora do ar"));

        NotificacaoService.emitirNotificacaoCriada(gravada(), 1);
        await esperarEntrega();

        expect(emitirParaUsuario.mock.calls[0][2].notificacao.titulo).toBe("Nova curtida na sua publicação");
    });

    it("sem notificação não faz nada", async () => {
        NotificacaoService.emitirNotificacaoCriada(null, 0);
        await esperarEntrega();

        expect(emitirParaUsuario).not.toHaveBeenCalled();
        expect(NotificacaoPushService.enviarParaUsuario).not.toHaveBeenCalled();
    });
});
