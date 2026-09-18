import { io, type Socket } from "socket.io-client";

import { API_URL } from "../../config/env";
import { obterAccessToken, notificarFimSessao, type MotivoFimSessao } from "../api/cliente";

/**
 * URL do Socket.IO: o mesmo host da API, sem o sufixo `/api` (mesma regra de
 * `Site/Frontend/src/services/socket.ts`).
 */
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

/**
 * Motivos de recusa do handshake que não adianta tentar de novo, com o mesmo `codigo` que o backend
 * usa no REST (`autenticacaoMiddleware.js`) e no socket (`realtime/socket.js`).
 */
const FIM_DE_SESSAO_POR_CODIGO: Record<string, MotivoFimSessao> = {
  CONTA_BLOQUEADA: "bloqueada",
  SENHA_ALTERADA: "senha_alterada",
};

let socket: Socket | null = null;

/**
 * Conecta ao Socket.IO com o token de acesso em memória, reaproveitando a mesma instância. Segue o
 * cliente do Site (`Site/Frontend/src/services/socket.ts`) com uma diferença: só o transporte
 * `websocket`, porque o React Native tem `WebSocket` nativo e o long-polling do `socket.io-client`
 * depende de XHR, que não é confiável no RN.
 *
 * O socket só complementa: todas as telas continuam funcionando pela API REST se a conexão falhar.
 */
export function conectarSocket(): Socket | null {
  const token = obterAccessToken();
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

    // O token do handshake não se atualiza sozinho. Como o token de acesso dura pouco (30 minutos
    // por padrão no backend), uma reconexão automática (rede caiu, servidor reiniciou) reenviaria
    // um token vencido e o socket não voltaria. Por isso o token é relido antes de cada tentativa,
    // como no Site.
    socket.io.on("reconnect_attempt", () => {
      const tokenAtual = obterAccessToken();
      if (socket && tokenAtual) {
        socket.auth = { token: tokenAtual };
      }
    });

    // Conta bloqueada ou senha trocada: o handshake é recusado com um `codigo` próprio e nenhuma
    // tentativa nova vai ser aceita. Não adianta deixar o `socket.io-client` insistir: desconecta
    // na hora e usa o mesmo encerramento de sessão do REST.
    socket.on("connect_error", (erro: Error & { data?: { codigo?: string } }) => {
      const motivo = erro.data?.codigo ? FIM_DE_SESSAO_POR_CODIGO[erro.data.codigo] : undefined;
      if (motivo) {
        socket?.disconnect();
        notificarFimSessao(motivo);
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

/** Chamado no logout/fim de sessão, nunca deixa uma conexão autenticada da sessão anterior viva. */
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
