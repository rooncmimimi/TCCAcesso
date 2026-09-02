import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, dispararSessaoExpirada, getAccessToken } from "./api";

/** URL do servidor Socket.IO (mesmo host do Express, sem o sufixo `/api`). */
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

/** Mesmo `codigo` usado pelo backend REST (authMiddleware/realtime/socket.js) para marcar rejeição por bloqueio administrativo. */
const CODIGO_CONTA_BLOQUEADA = "CONTA_BLOQUEADA";

let socket: Socket | null = null;

/**
 * Conecta (uma única vez) ao Socket.IO usando o access token JWT.
 * Todas as telas continuam funcionando via REST caso a conexão falhe.
 */
export function conectarSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1_000,
      autoConnect: true,
    });

    // Fase 9: bloqueio administrativo rejeita o handshake com um `codigo`
    // identificável (ver realtime/socket.js) — nesse caso específico não
    // faz sentido deixar o socket.io-client insistir nas próximas
    // tentativas automáticas (a conta continua bloqueada, vai falhar de
    // novo); desconecta na hora e reaproveita o MESMO encerramento de
    // sessão do REST (services/api.ts), em vez de uma segunda
    // implementação só para o socket.
    socket.on("connect_error", (erro: Error & { data?: { codigo?: string } }) => {
      if (erro.data?.codigo === CODIGO_CONTA_BLOQUEADA) {
        socket?.disconnect();
        dispararSessaoExpirada(erro.message);
      }
    });
  } else {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function obterSocket(): Socket | null {
  return socket;
}

export function desconectarSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Registra um listener e devolve a função de limpeza (uso em useEffect). */
export function ouvirEvento<T = unknown>(evento: string, handler: (dados: T) => void): () => void {
  const atual = conectarSocket();
  if (!atual) return () => undefined;

  atual.on(evento, handler as (...args: unknown[]) => void);
  return () => {
    atual.off(evento, handler as (...args: unknown[]) => void);
  };
}

export function entrarNaConversa(conversaId: string): void {
  conectarSocket()?.emit("conversa:entrar", conversaId);
}

export function sairDaConversa(conversaId: string): void {
  obterSocket()?.emit("conversa:sair", conversaId);
}

export function emitirDigitando(conversaId: string, digitando: boolean): void {
  obterSocket()?.emit("mensagem:digitando", { conversaId, digitando });
}

export default conectarSocket;
