/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockIo = jest.fn();

jest.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

const mockGetAccessToken = jest.fn();
const mockNotifySessionEnded = jest.fn();

jest.mock("../../api/client", () => ({
  getAccessToken: () => mockGetAccessToken(),
  notifySessionEnded: (...args: unknown[]) => mockNotifySessionEnded(...args),
}));

import {
  conectarSocket,
  desconectarSocket,
  emitirDigitando,
  entrarNaConversa,
  obterSocket,
  ouvirEvento,
  sairDaConversa,
  SOCKET_URL,
} from "../socketClient";

/** Fake mínimo de `Socket` — só a superfície que `socketClient.ts` realmente usa. */
function criarSocketFalso() {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  const ioHandlers = new Map<string, ((...args: unknown[]) => void)[]>();

  const socketFalso = {
    connected: true,
    auth: {} as Record<string, unknown>,
    on: jest.fn((evento: string, handler: (...args: unknown[]) => void) => {
      handlers.set(evento, [...(handlers.get(evento) ?? []), handler]);
    }),
    off: jest.fn((evento: string, handler: (...args: unknown[]) => void) => {
      handlers.set(evento, (handlers.get(evento) ?? []).filter((h) => h !== handler));
    }),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    io: {
      on: jest.fn((evento: string, handler: (...args: unknown[]) => void) => {
        ioHandlers.set(evento, [...(ioHandlers.get(evento) ?? []), handler]);
      }),
    },
    __disparar: (evento: string, ...args: unknown[]) => {
      (handlers.get(evento) ?? []).forEach((h) => h(...args));
    },
    __dispararIo: (evento: string, ...args: unknown[]) => {
      (ioHandlers.get(evento) ?? []).forEach((h) => h(...args));
    },
  };

  return socketFalso;
}

describe("socketClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    desconectarSocket();
    mockGetAccessToken.mockReturnValue("token-valido");
  });

  it("SOCKET_URL remove o sufixo /api da URL da API", () => {
    expect(SOCKET_URL).not.toMatch(/\/api\/?$/);
  });

  describe("conectarSocket", () => {
    it("sem access token, não conecta (devolve null)", () => {
      mockGetAccessToken.mockReturnValue(null);

      const resultado = conectarSocket();

      expect(resultado).toBeNull();
      expect(mockIo).not.toHaveBeenCalled();
    });

    it("com token, conecta com auth+transports certos e reaproveita a mesma instância em chamadas seguintes", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);

      const primeira = conectarSocket();
      const segunda = conectarSocket();

      expect(mockIo).toHaveBeenCalledTimes(1);
      expect(mockIo).toHaveBeenCalledWith(
        SOCKET_URL,
        expect.objectContaining({ auth: { token: "token-valido" }, transports: ["websocket"] }),
      );
      expect(primeira).toBe(socketFalso);
      expect(segunda).toBe(socketFalso);
    });

    it("reconexão automática relê o token atual (não usa o do handshake original)", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);
      conectarSocket();

      mockGetAccessToken.mockReturnValue("token-renovado");
      socketFalso.__dispararIo("reconnect_attempt");

      expect(socketFalso.auth).toEqual({ token: "token-renovado" });
    });

    it("connect_error com código CONTA_BLOQUEADA desconecta e notifica fim de sessão", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);
      conectarSocket();

      socketFalso.__disparar("connect_error", Object.assign(new Error("bloqueado"), { data: { codigo: "CONTA_BLOQUEADA" } }));

      expect(socketFalso.disconnect).toHaveBeenCalled();
      expect(mockNotifySessionEnded).toHaveBeenCalledWith("blocked");
    });

    it("connect_error sem código de bloqueio não desconecta nem notifica (deixa o socket.io-client tentar de novo sozinho)", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);
      conectarSocket();

      socketFalso.__disparar("connect_error", new Error("rede instável"));

      expect(socketFalso.disconnect).not.toHaveBeenCalled();
      expect(mockNotifySessionEnded).not.toHaveBeenCalled();
    });
  });

  describe("desconectarSocket", () => {
    it("desconecta e libera a instância (a próxima conectarSocket cria uma nova)", () => {
      const socketFalso1 = criarSocketFalso();
      mockIo.mockReturnValueOnce(socketFalso1);
      conectarSocket();

      desconectarSocket();
      expect(socketFalso1.disconnect).toHaveBeenCalled();
      expect(obterSocket()).toBeNull();

      const socketFalso2 = criarSocketFalso();
      mockIo.mockReturnValueOnce(socketFalso2);
      conectarSocket();
      expect(mockIo).toHaveBeenCalledTimes(2);
    });
  });

  describe("ouvirEvento", () => {
    it("registra o handler e a função de limpeza remove só ele", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);
      const handler = jest.fn();

      const limpar = ouvirEvento("mensagem:nova", handler);
      socketFalso.__disparar("mensagem:nova", { conversaId: "c1" });
      expect(handler).toHaveBeenCalledWith({ conversaId: "c1" });

      limpar();
      socketFalso.__disparar("mensagem:nova", { conversaId: "c2" });
      expect(handler).toHaveBeenCalledTimes(1); // não chamado de novo depois de limpar
    });

    it("sem access token, devolve uma função de limpeza inofensiva (não lança)", () => {
      mockGetAccessToken.mockReturnValue(null);
      const limpar = ouvirEvento("mensagem:nova", jest.fn());
      expect(() => limpar()).not.toThrow();
    });
  });

  describe("ações da conversa", () => {
    it("entrarNaConversa emite 'conversa:entrar' com o id", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);

      entrarNaConversa("c1");

      expect(socketFalso.emit).toHaveBeenCalledWith("conversa:entrar", "c1");
    });

    it("sairDaConversa emite 'conversa:sair' com o id", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);
      conectarSocket();

      sairDaConversa("c1");

      expect(socketFalso.emit).toHaveBeenCalledWith("conversa:sair", "c1");
    });

    it("emitirDigitando emite 'mensagem:digitando' com conversaId+digitando", () => {
      const socketFalso = criarSocketFalso();
      mockIo.mockReturnValue(socketFalso);
      conectarSocket();

      emitirDigitando("c1", true);

      expect(socketFalso.emit).toHaveBeenCalledWith("mensagem:digitando", { conversaId: "c1", digitando: true });
    });
  });
});
