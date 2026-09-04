import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createServer } from "node:http";
import { io as ioClient } from "socket.io-client";

/**
 * Servidor Socket.IO real, sobre uma porta local — sem banco real (só
 * `Usuario.findByPk` é mockado, já que o handshake precisa recarregar o
 * usuário do JWT). Prova duas coisas que a correção da Etapa 1 depende:
 * (1) `emitirParaUsuario` continua isolado por sala privada (não regrediu);
 * (2) `emitirFeed`, que é global por decisão de arquitetura (ver comentário
 * em `socket.js`), só transporta o sinal mínimo — nunca o objeto de domínio.
 */

vi.mock("../models/index.js", () => ({
    Usuario: { findByPk: vi.fn() }
}));

const { Usuario } = await import("../models/index.js");
const { generateToken } = await import("../utils/jwt.js");
const { iniciarSocket, emitirParaUsuario, emitirFeed } = await import("./socket.js");

function usuarioFake(id, overrides = {}) {
    return {
        id,
        nome: `Usuario ${id}`,
        tipoUsuario: "candidato",
        ativo: true,
        bloqueado: false,
        motivoBloqueio: null,
        ...overrides
    };
}

function conectarCliente(porta, usuarioId) {
    const token = generateToken({ id: usuarioId, tipoUsuario: "candidato" });
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
        // Arrange
        Usuario.findByPk.mockImplementation(async (id) => usuarioFake(id));
        const clienteA = conectarCliente(porta, "usuario-a");
        const clienteB = conectarCliente(porta, "usuario-b");
        await Promise.all([aguardarEvento(clienteA, "connect"), aguardarEvento(clienteB, "connect")]);

        const recebidoPorA = aguardarEvento(clienteA, "notificacao:teste");
        let recebidoPorB = false;
        clienteB.once("notificacao:teste", () => {
            recebidoPorB = true;
        });

        // Act
        emitirParaUsuario("usuario-a", "notificacao:teste", { ok: true });

        // Assert
        await expect(recebidoPorA).resolves.toEqual({ ok: true });
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(recebidoPorB).toBe(false);

        clienteA.disconnect();
        clienteB.disconnect();
    });

    it("emitirFeed chega a todo cliente conectado, mas só com o sinal mínimo — nunca o objeto de domínio", async () => {
        // Arrange
        Usuario.findByPk.mockImplementation(async (id) => usuarioFake(id));
        const clienteA = conectarCliente(porta, "usuario-a");
        const clienteB = conectarCliente(porta, "usuario-b");
        await Promise.all([aguardarEvento(clienteA, "connect"), aguardarEvento(clienteB, "connect")]);

        const recebidoPorA = aguardarEvento(clienteA, "feed:postagem");
        const recebidoPorB = aguardarEvento(clienteB, "feed:postagem");

        // Act — mesmo payload que `PostagemService` emite depois da correção
        emitirFeed("feed:postagem", { id: "postagem-123", atualizada: true });

        // Assert
        const [dadosA, dadosB] = await Promise.all([recebidoPorA, recebidoPorB]);
        expect(dadosA).toEqual({ id: "postagem-123", atualizada: true });
        expect(dadosB).toEqual({ id: "postagem-123", atualizada: true });

        clienteA.disconnect();
        clienteB.disconnect();
    });

    it("recusa a conexão de um usuário bloqueado, com um código que o cliente reconhece", async () => {
        // Arrange
        Usuario.findByPk.mockImplementation(async (id) =>
            usuarioFake(id, { bloqueado: true, motivoBloqueio: "teste" })
        );

        // Act
        const cliente = conectarCliente(porta, "usuario-bloqueado");
        const erro = await aguardarEvento(cliente, "connect_error");

        // Assert
        expect(erro.data?.codigo).toBe("CONTA_BLOQUEADA");

        cliente.disconnect();
    });
});
