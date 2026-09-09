import { io, type Socket } from "socket.io-client";

import { API_URL } from "../../config/env";
import { getAccessToken, notifySessionEnded } from "../api/client";

/** URL do servidor Socket.IO — mesmo host do Express, sem o sufixo `/api` (mesma derivação de `Site/Frontend/src/services/socket.ts`). */
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

/** Mesmo `codigo` usado pelo backend REST (`authMiddleware`) e pelo handshake do socket (`realtime/socket.js`) para marcar rejeição por bloqueio administrativo. */
const CODIGO_CONTA_BLOQUEADA = "CONTA_BLOQUEADA";

let socket: Socket | null = null;

/**
 * Conecta (uma única vez, reaproveitando a mesma instância) ao Socket.IO
 * usando o access token JWT em memória. Espelha `Site/Frontend/src/services
 * /socket.ts` (mesma API real do backend) — a única adaptação para React
 * Native é `transports: ["websocket"]` sozinho: o `WebSocket` nativo do RN
 * é suportado de fábrica, e o transporte de long-polling do
 * `socket.io-client` depende de APIs de XHR que se comportam de forma
 * inconsistente no runtime do React Native (achado documentado em várias
 * issues do próprio `socket.io-client` para RN) — sem necessidade de manter
 * os dois quando só um já é confiável aqui.
 *
 * Toda tela continua funcionando via REST caso a conexão de socket falhe —
 * o socket só COMPLEMENTA (tempo real), nunca é a única fonte de dado.
 */
export function conectarSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1_000,
      autoConnect: true,
    });

    // O access token do handshake inicial acima nunca era atualizado sozinho
    // — com a validade curta do token (~30min, ver `services/api/client.ts`),
    // uma reconexão automática do próprio socket.io-client (rede caiu,
    // servidor reiniciou) reenviaria esse MESMO token já expirado, o
    // handshake falharia, e o socket ficaria sem conectar silenciosamente.
    // Relê o token atual antes de CADA tentativa de reconexão — mesmo
    // mecanismo de reconexão do socket.io-client, só garantindo que carregue
    // o token mais recente (mesma correção já aplicada no site).
    socket.io.on("reconnect_attempt", () => {
      const tokenAtual = getAccessToken();
      if (socket && tokenAtual) {
        socket.auth = { token: tokenAtual };
      }
    });

    // Bloqueio administrativo rejeita o handshake com um `codigo`
    // identificável (`realtime/socket.js`) — nesse caso não faz sentido
    // deixar o socket.io-client insistir nas próximas tentativas
    // automáticas; desconecta na hora e reaproveita o MESMO encerramento de
    // sessão que o REST já usa (`registerSessionEndedListener`), em vez de
    // uma segunda implementação só para o socket.
    socket.on("connect_error", (erro: Error & { data?: { codigo?: string } }) => {
      if (erro.data?.codigo === CODIGO_CONTA_BLOQUEADA) {
        socket?.disconnect();
        notifySessionEnded("blocked");
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

/** Chamado no logout/fim de sessão — nunca deixa uma conexão autenticada da sessão anterior viva. */
export function desconectarSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Registra um listener e devolve a função de limpeza (uso em `useEffect`). */
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
