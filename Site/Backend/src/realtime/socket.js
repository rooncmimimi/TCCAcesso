import { Server } from "socket.io";

import env from "../config/env.js";
import { verificarJwt, tokenAnteriorATrocaDeSenha } from "../utils/jwt.js";
import { Usuario, Conversa } from "../models/index.js";

/**
 * Camada de tempo real (Socket.IO).
 *
 * Segurança:
 * - o handshake exige um access token JWT válido (mesmo segredo da API), emitido depois da última
 *   troca de senha da conta;
 * - o usuário é recarregado do banco (bloqueado ou desativado não conecta);
 * - cada usuário entra na própria sala privada (`usuario:<id>`) e só nas salas das conversas de que
 *   participa, conferidas no banco a cada `conversa:entrar`;
 * - nenhum dado sensível é emitido em broadcast global (veja `emitirFeed`).
 */

let io = null;

export const salaUsuario = (usuarioId) => `usuario:${usuarioId}`;
export const salaConversa = (conversaId) => `conversa:${conversaId}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Só quem é um dos dois participantes entra na sala da conversa. Exportada para o teste de
 * autorização (`socket.test.js`) cobrir id inválido, conversa inexistente e não participante sem
 * precisar subir um servidor.
 */
export async function participaDaConversa(conversaId, usuarioId) {
    if (typeof conversaId !== "string" || !UUID.test(conversaId)) {
        return false;
    }

    const conversa = await Conversa.findByPk(conversaId, {
        attributes: ["usuarioAId", "usuarioBId"]
    });

    if (!conversa) {
        return false;
    }

    return (
        String(conversa.usuarioAId) === String(usuarioId) ||
        String(conversa.usuarioBId) === String(usuarioId)
    );
}

/**
 * Cria o servidor Socket.IO sobre o servidor HTTP, autentica o handshake e registra os eventos de
 * sala e de digitação.
 */
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

            const payload = verificarJwt(token);

            const usuario = await Usuario.findByPk(payload.id, {
                attributes: [
                    "id",
                    "nome",
                    "tipoUsuario",
                    "ativo",
                    "bloqueado",
                    "motivoBloqueio",
                    "senhaAlteradaEm"
                ]
            });

            if (!usuario) {
                return next(new Error("Sessão inválida."));
            }

            // Mesma regra do `autenticacaoMiddleware`: token emitido antes da última troca de senha
            // não vale mais, então trocar a senha derruba também as conexões de tempo real. Vai com
            // `codigo`, como o bloqueio, para o cliente encerrar a sessão em vez de reconectar com
            // um token que nunca mais vai ser aceito.
            if (tokenAnteriorATrocaDeSenha(payload, usuario)) {
                const erro = new Error("Sua senha foi alterada. Entre novamente.");
                erro.data = { codigo: "SENHA_ALTERADA" };
                return next(erro);
            }

            // Mesma distinção do REST: o bloqueio administrativo tem `err.data.codigo`, para o
            // cliente parar de reconectar em vez de insistir até esgotar as tentativas automáticas.
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

        // A sala de uma conversa entrega o conteúdo das mensagens, então participar dela é conferido
        // aqui, no servidor, e não no cliente. Quem não participa nunca entra, mesmo sabendo o id.
        // `confirmar` é opcional: quando o cliente manda uma função de retorno, ela recebe o
        // resultado.
        socket.on("conversa:entrar", async (conversaId, confirmar) => {
            const permitido = await participaDaConversa(conversaId, id);

            if (permitido) {
                socket.join(salaConversa(conversaId));
            }

            if (typeof confirmar === "function") {
                confirmar(
                    permitido
                        ? { permitido: true }
                        : { permitido: false, mensagem: "Conversa não disponível." }
                );
            }
        });

        socket.on("conversa:sair", (conversaId) => {
            if (typeof conversaId === "string") {
                socket.leave(salaConversa(conversaId));
            }
        });

        // Só repassa "digitando" para uma sala em que este socket já entrou, ou seja, para uma
        // conversa que já passou pela checagem de participante.
        socket.on("mensagem:digitando", (dados) => {
            const conversaId = dados?.conversaId;

            if (typeof conversaId !== "string" || !socket.rooms.has(salaConversa(conversaId))) {
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

/** Emite só para a sala privada do usuário. Antes de `iniciarSocket` (como nos testes) não faz nada. */
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

/**
 * Eventos públicos do feed: `io.emit`, sem sala, chega a todo cliente conectado, independente de
 * seguir o autor, ter bloqueio ou o perfil ser privado. Por isso `dados` nunca pode carregar um
 * objeto de domínio completo (postagem, comentário) nem URL de anexo, assinada ou não: qualquer um
 * deles contornaria a autorização que a API REST aplica (`garantirAcessoAPostagem`). Envie só
 * `{ id, <marcador> }`; quem recebe busca de novo pela API, que decide o que cada um pode ver.
 */
export const emitirFeed = (evento, dados) => {
    if (!io) {
        return;
    }

    io.emit(evento, dados);
};

export default { iniciarSocket, obterIo, emitirParaUsuario, emitirFeed };
