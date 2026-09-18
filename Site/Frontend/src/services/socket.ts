import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, dispararSessaoExpirada, obterAccessToken } from "./api";

/** URL do servidor Socket.IO (mesmo host do Express, sem o sufixo `/api`). */
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

/**
 * Mesmo `codigo` que o backend usa no REST (`autenticacaoMiddleware.js`) e no handshake do socket
 * (`realtime/socket.js`) quando a conta está bloqueada.
 */
const CODIGO_CONTA_BLOQUEADA = "CONTA_BLOQUEADA";

let socket: Socket | null = null;

/**
 * Conecta (uma única vez) ao Socket.IO usando o access token JWT.
 * Todas as telas continuam funcionando via REST caso a conexão falhe.
 */
export function conectarSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = obterAccessToken();
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

    // O token do handshake não se atualiza sozinho. Como o access token dura pouco (30 minutos por
    // padrão no backend), uma reconexão automática (rede caiu, servidor reiniciou) reenviaria um
    // token vencido, o handshake falharia e o tempo real pararia em silêncio, mesmo com a sessão
    // REST válida. Por isso o token é relido do localStorage antes de cada tentativa de reconexão.
    socket.io.on("reconnect_attempt", () => {
      const tokenAtual = obterAccessToken();
      if (socket && tokenAtual) {
        socket.auth = { token: tokenAtual };
      }
    });

    // Com a conta bloqueada, o handshake é recusado com um `codigo` próprio (ver
    // `realtime/socket.js`). Não adianta o `socket.io-client` insistir: desconecta na hora e usa o
    // mesmo encerramento de sessão do REST (`api.ts`).
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

/** O servidor só coloca o socket na sala se a conta participar da conversa. */
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
