import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createServer } from "node:http";
import { io as ioClient } from "socket.io-client";

/**
 * Servidor Socket.IO real numa porta local, sem banco (só `Usuario.findByPk` é mockado, porque o
 * handshake recarrega o usuário do JWT). Confere que `emitirParaUsuario` continua isolado por sala
 * privada e que `emitirFeed`, global por decisão de arquitetura (ver `socket.js`), só transporta o
 * sinal mínimo, nunca o objeto de domínio.
 */

vi.mock("../models/index.js", () => ({
    Usuario: { findByPk: vi.fn() },
    Conversa: { findByPk: vi.fn() }
}));

const { Usuario, Conversa } = await import("../models/index.js");
const { assinarJwt } = await import("../utils/jwt.js");
const { iniciarSocket, emitirParaUsuario, emitirParaConversa, emitirFeed } = await import("./socket.js");

function usuarioFake(id, overrides = {}) {
    return {
        id,
        nome: `Usuario ${id}`,
        tipoUsuario: "candidato",
        ativo: true,
        bloqueado: false,
        motivoBloqueio: null,
        senhaAlteradaEm: null,
        ...overrides
    };
}

/** `participaDaConversa` exige UUID, então os ids dos testes de conversa são UUIDs de verdade. */
const CONVERSA_AB = "11111111-1111-4111-8111-111111111111";
const CONVERSA_DE_OUTROS = "22222222-2222-4222-8222-222222222222";
const USUARIO_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USUARIO_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/** Pede para entrar na sala e devolve a resposta do servidor (o ack de `conversa:entrar`). */
function pedirParaEntrar(cliente, conversaId, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout esperando o ack de conversa:entrar")), timeoutMs);
        cliente.emit("conversa:entrar", conversaId, (resposta) => {
            clearTimeout(timer);
            resolve(resposta);
        });
    });
}

function conectarCliente(porta, usuarioId) {
    const token = assinarJwt({ id: usuarioId, tipoUsuario: "candidato" });
    return ioClient(`http://localhost:${porta}`, {
        auth: { token },
        transports: ["websocket"],
        reconnection: false
    });
}

function aguardarEvento(socket, evento, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`timeout esperando o evento "${evento}"`)),
            timeoutMs
        );
        socket.once(evento, (dados) => {
            clearTimeout(timer);
            resolve(dados);
        });
    });
}

describe("Socket.IO — isolamento de salas e payload do feed", () => {
    let httpServer;
    let porta;

    beforeAll(async () => {
        httpServer = createServer();
        iniciarSocket(httpServer);
        await new Promise((resolve) => httpServer.listen(0, resolve));
        porta = httpServer.address().port;
    });

    afterAll(() => {
        httpServer.close();
    });

    it("emitirParaUsuario entrega só ao destinatário — outro cliente conectado não recebe", async () => {
        Usuario.findByPk.mockImplementation(async (id) => usuarioFake(id));
        const clienteA = conectarCliente(porta, "usuario-a");
        const clienteB = conectarCliente(porta, "usuario-b");
        await Promise.all([aguardarEvento(clienteA, "connect"), aguardarEvento(clienteB, "connect")]);

        const recebidoPorA = aguardarEvento(clienteA, "notificacao:teste");
        let recebidoPorB = false;
        clienteB.once("notificacao:teste", () => {
            recebidoPorB = true;
        });

        emitirParaUsuario("usuario-a", "notificacao:teste", { ok: true });

        await expect(recebidoPorA).resolves.toEqual({ ok: true });
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(recebidoPorB).toBe(false);

        clienteA.disconnect();
        clienteB.disconnect();
    });

    it("emitirFeed chega a todo cliente conectado, mas só com o sinal mínimo — nunca o objeto de domínio", async () => {
        Usuario.findByPk.mockImplementation(async (id) => usuarioFake(id));
        const clienteA = conectarCliente(porta, "usuario-a");
        const clienteB = conectarCliente(porta, "usuario-b");
        await Promise.all([aguardarEvento(clienteA, "connect"), aguardarEvento(clienteB, "connect")]);

        const recebidoPorA = aguardarEvento(clienteA, "feed:postagem");
        const recebidoPorB = aguardarEvento(clienteB, "feed:postagem");

        // Mesmo payload que o `PostagemService` emite.
        emitirFeed("feed:postagem", { id: "postagem-123", atualizada: true });

        const [dadosA, dadosB] = await Promise.all([recebidoPorA, recebidoPorB]);
        expect(dadosA).toEqual({ id: "postagem-123", atualizada: true });
        expect(dadosB).toEqual({ id: "postagem-123", atualizada: true });

        clienteA.disconnect();
        clienteB.disconnect();
    });

    it("recusa a conexão de um usuário bloqueado, com um código que o cliente reconhece", async () => {
        Usuario.findByPk.mockImplementation(async (id) =>
            usuarioFake(id, { bloqueado: true, motivoBloqueio: "teste" })
        );

        const cliente = conectarCliente(porta, "usuario-bloqueado");
        const erro = await aguardarEvento(cliente, "connect_error");

        expect(erro.data?.codigo).toBe("CONTA_BLOQUEADA");

        cliente.disconnect();
    });

    it("recusa um token emitido antes da última troca de senha, com o mesmo código do REST", async () => {
        // Senha trocada agora; o token do teste foi emitido no segundo anterior.
        const daquiAUmMinuto = new Date(Date.now() + 60_000);
        Usuario.findByPk.mockImplementation(async (id) =>
            usuarioFake(id, { senhaAlteradaEm: daquiAUmMinuto })
        );

        const cliente = conectarCliente(porta, USUARIO_A);
        const erro = await aguardarEvento(cliente, "connect_error");

        expect(erro.data?.codigo).toBe("SENHA_ALTERADA");

        cliente.disconnect();
    });
});

/**
 * Entrar na sala de uma conversa dá acesso ao conteúdo das mensagens em tempo real, então a
 * checagem é do servidor: saber o id não basta.
 */
describe("Socket.IO — autorização das salas de conversa", () => {
    let httpServer;
    let porta;

    beforeAll(async () => {
        httpServer = createServer();
        iniciarSocket(httpServer);
        await new Promise((resolve) => httpServer.listen(0, resolve));
        porta = httpServer.address().port;
    });

    afterAll(() => {
        httpServer.close();
    });

    beforeEach(() => {
        Usuario.findByPk.mockImplementation(async (id) => usuarioFake(id));
        Conversa.findByPk.mockImplementation(async (id) =>
            id === CONVERSA_AB ? { usuarioAId: USUARIO_A, usuarioBId: USUARIO_B } : null
        );
    });

    it("participante entra na sala e recebe as mensagens da conversa", async () => {
        const clienteA = conectarCliente(porta, USUARIO_A);
        await aguardarEvento(clienteA, "connect");

        await expect(pedirParaEntrar(clienteA, CONVERSA_AB)).resolves.toEqual({ permitido: true });

        const recebida = aguardarEvento(clienteA, "mensagem:nova");
        emitirParaConversa(CONVERSA_AB, "mensagem:nova", { conversaId: CONVERSA_AB });
        await expect(recebida).resolves.toEqual({ conversaId: CONVERSA_AB });

        clienteA.disconnect();
    });

    it("quem não participa é recusado e não recebe as mensagens, mesmo sabendo o id da conversa", async () => {
        Conversa.findByPk.mockResolvedValue({
            usuarioAId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            usuarioBId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
        });

        const intruso = conectarCliente(porta, USUARIO_A);
        await aguardarEvento(intruso, "connect");

        await expect(pedirParaEntrar(intruso, CONVERSA_DE_OUTROS)).resolves.toEqual({
            permitido: false,
            mensagem: "Conversa não disponível."
        });

        let recebeu = false;
        intruso.once("mensagem:nova", () => {
            recebeu = true;
        });
        emitirParaConversa(CONVERSA_DE_OUTROS, "mensagem:nova", { conversaId: CONVERSA_DE_OUTROS });
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(recebeu).toBe(false);

        intruso.disconnect();
    });

    it.each([
        ["id que não é UUID", "conversa-1; DROP TABLE"],
        ["id vazio", ""],
        ["id que não é string", { conversaId: CONVERSA_AB }]
    ])("recusa %s sem consultar o banco", async (_caso, idInvalido) => {
        const cliente = conectarCliente(porta, USUARIO_A);
        await aguardarEvento(cliente, "connect");
        Conversa.findByPk.mockClear();

        const resposta = await pedirParaEntrar(cliente, idInvalido);

        expect(resposta.permitido).toBe(false);
        expect(Conversa.findByPk).not.toHaveBeenCalled();

        cliente.disconnect();
    });

    it("recusa uma conversa que não existe", async () => {
        const cliente = conectarCliente(porta, USUARIO_A);
        await aguardarEvento(cliente, "connect");

        const resposta = await pedirParaEntrar(cliente, CONVERSA_DE_OUTROS);

        expect(resposta.permitido).toBe(false);

        cliente.disconnect();
    });

    it("'digitando' de quem não entrou na sala não chega a ninguém", async () => {
        const participante = conectarCliente(porta, USUARIO_B);
        const intruso = conectarCliente(porta, USUARIO_A);
        await Promise.all([aguardarEvento(participante, "connect"), aguardarEvento(intruso, "connect")]);
        await pedirParaEntrar(participante, CONVERSA_AB);

        // O intruso nem pediu para entrar: emitir direto não pode alcançar a sala.
        let recebeu = false;
        participante.once("mensagem:digitando", () => {
            recebeu = true;
        });
        intruso.emit("mensagem:digitando", { conversaId: CONVERSA_AB, digitando: true });

        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(recebeu).toBe(false);

        participante.disconnect();
        intruso.disconnect();
    });
});
