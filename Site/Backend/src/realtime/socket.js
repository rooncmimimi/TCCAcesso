import { Server } from "socket.io";

import env from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";

/**
 * Camada de tempo real (Socket.IO).
 *
 * Segurança:
 * - handshake exige um access token JWT válido (mesmo segredo da API);
 * - o usuário é recarregado do banco (bloqueado/desativado não conecta);
 * - cada usuário entra apenas na sua própria sala privada;
 * - nenhum dado sensível é emitido em broadcast global.
 */

let io = null;

export const salaUsuario = (usuarioId) => `usuario:${usuarioId}`;
export const salaConversa = (conversaId) => `conversa:${conversaId}`;

export const iniciarSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: env.security.corsOrigins,
            credentials: true
        },
        pingTimeout: 30000
    });

    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                String(socket.handshake.headers.authorization || "").replace(
                    /^Bearer\s+/i,
                    ""
                );

            if (!token) {
                return next(new Error("Token não informado."));
            }

            const payload = verifyToken(token);

            const usuario = await Usuario.findByPk(payload.id, {
                attributes: ["id", "nome", "tipoUsuario", "ativo", "bloqueado", "motivoBloqueio"]
            });

            if (!usuario) {
                return next(new Error("Sessão inválida."));
            }

            // Fase 9 (Bloco 3): mesma distinção do REST — bloqueio
            // administrativo é identificável (`err.data.codigo`) para o
            // cliente parar de tentar reconectar, em vez de insistir até
            // esgotar as tentativas automáticas do socket.io-client.
            if (usuario.bloqueado) {
                const erro = new Error(
                    usuario.motivoBloqueio
                        ? `Sua conta foi bloqueada pela moderação do ACESSO. Motivo: ${usuario.motivoBloqueio}`
                        : "Sua conta foi bloqueada pela moderação do ACESSO."
                );
                erro.data = { codigo: "CONTA_BLOQUEADA" };
                return next(erro);
            }

            if (!usuario.ativo) {
                return next(new Error("Sessão inválida."));
            }

            socket.data.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                tipoUsuario: usuario.tipoUsuario
            };

            return next();
        } catch {
            return next(new Error("Falha na autenticação do socket."));
        }
    });

    io.on("connection", (socket) => {
        const { id } = socket.data.usuario;

        socket.join(salaUsuario(id));

        socket.on("conversa:entrar", (conversaId) => {
            if (typeof conversaId === "string" && conversaId.length <= 64) {
                socket.join(salaConversa(conversaId));
            }
        });

        socket.on("conversa:sair", (conversaId) => {
            if (typeof conversaId === "string") {
                socket.leave(salaConversa(conversaId));
            }
        });

        socket.on("mensagem:digitando", (dados) => {
            const conversaId = dados?.conversaId;

            if (typeof conversaId !== "string") {
                return;
            }

            socket.to(salaConversa(conversaId)).emit("mensagem:digitando", {
                conversaId,
                usuarioId: id,
                digitando: Boolean(dados?.digitando)
            });
        });
    });

    return io;
};

export const obterIo = () => io;

export const emitirParaUsuario = (usuarioId, evento, dados) => {
    if (!io || !usuarioId) {
        return;
    }

    io.to(salaUsuario(usuarioId)).emit(evento, dados);
};

export const emitirParaConversa = (conversaId, evento, dados) => {
    if (!io || !conversaId) {
        return;
    }

    io.to(salaConversa(conversaId)).emit(evento, dados);
};

/** Eventos públicos do feed (sem dados sensíveis). */
export const emitirFeed = (evento, dados) => {
    if (!io) {
        return;
    }

    io.emit(evento, dados);
};

export default { iniciarSocket, obterIo, emitirParaUsuario, emitirFeed };
