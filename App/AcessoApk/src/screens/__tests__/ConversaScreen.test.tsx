/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockListarMensagens = jest.fn();
const mockEnviarMensagem = jest.fn();
const mockMarcarComoLidas = jest.fn();
const mockEntrarNaConversa = jest.fn();
const mockSairDaConversa = jest.fn();
const mockEmitirDigitando = jest.fn();
const mockOuvirEvento = jest.fn();

jest.mock("../../mensagens", () => ({
  ...jest.requireActual("../../mensagens"),
  ConversaService: {
    listarMensagens: (...args: unknown[]) => mockListarMensagens(...args),
    enviarMensagem: (...args: unknown[]) => mockEnviarMensagem(...args),
    marcarComoLidas: (...args: unknown[]) => mockMarcarComoLidas(...args),
  },
}));

jest.mock("../../services/socket/socketClient", () => ({
  entrarNaConversa: (...args: unknown[]) => mockEntrarNaConversa(...args),
  sairDaConversa: (...args: unknown[]) => mockSairDaConversa(...args),
  emitirDigitando: (...args: unknown[]) => mockEmitirDigitando(...args),
  ouvirEvento: (...args: unknown[]) => mockOuvirEvento(...args),
}));

jest.mock("../../autenticacao", () => ({
  useAutenticacao: () => ({
    status: "autenticado",
    usuario: { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    autenticado: true,
    carregando: false,
    motivoFimSessao: null,
    entrar: jest.fn(),
    sair: jest.fn(),
    limparMotivoFimSessao: jest.fn(),
  }),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AcessibilidadeProvider } from "../../acessibilidade";
import type { AppStackParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { ConversaScreen } from "../ConversaScreen";

const mensagem = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "m1",
  conversaId: "c1",
  remetenteId: "u2",
  conteudo: "Oi!",
  lida: false,
  criadoEm: "2026-01-01T10:00:00.000Z",
  atualizadoEm: "2026-01-01T10:00:00.000Z",
  remetente: { id: "u2", nome: "Beatriz Souza", fotoPerfil: null },
  ...sobrescreve,
});

const envelope = (mensagens: unknown[]) => ({
  sucesso: true,
  total: mensagens.length,
  pagina: 1,
  limite: 100,
  totalPaginas: 1,
  mensagens,
});

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const navigationMock = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
} as unknown as NativeStackScreenProps<AppStackParamList, "Conversation">["navigation"];

type CapturaEventos = Record<string, (dados: unknown) => void>;

function prepararCapturaDeEventos(): CapturaEventos {
  const capturados: CapturaEventos = {};
  mockOuvirEvento.mockImplementation((evento: string, handler: (dados: unknown) => void) => {
    capturados[evento] = handler;
    return () => undefined;
  });
  return capturados;
}

async function renderTela(nomeOutroParticipante = "Beatriz Souza") {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <ConversaScreen
          navigation={navigationMock}
          route={{ key: "Conversation", name: "Conversation", params: { conversaId: "c1", nomeOutroParticipante } }}
        />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ConversaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOuvirEvento.mockReturnValue(() => undefined);
    mockMarcarComoLidas.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Rede de segurança: se um teste de fake timers falhar antes de
    // restaurar os reais, os testes seguintes (que dependem de tempo real
    // para `waitFor`/`findBy*`) não devem quebrar em cascata por causa disso.
    jest.useRealTimers();
  });

  it("mostra loading, depois as mensagens", async () => {
    mockListarMensagens.mockResolvedValue(envelope([mensagem()]));
    const { findByText } = await renderTela();

    expect(await findByText("Oi!")).toBeTruthy();
    expect(mockListarMensagens).toHaveBeenCalledWith("c1", { page: 1, limit: 100 });
  });

  it("define o título do header com o nome do outro participante", async () => {
    mockListarMensagens.mockResolvedValue(envelope([]));
    await renderTela("Carlos");

    expect(mockSetOptions).toHaveBeenCalledWith({ title: "Carlos" });
  });

  it("estado vazio mostra 'Diga olá!'", async () => {
    mockListarMensagens.mockResolvedValue(envelope([]));
    const { findByText } = await renderTela();

    expect(await findByText(/Diga olá/)).toBeTruthy();
  });

  it("ao montar, entra na sala da conversa e marca como lida; ao desmontar, sai da sala", async () => {
    mockListarMensagens.mockResolvedValue(envelope([]));
    const { unmount, findByText } = await renderTela();
    await findByText(/Diga olá/);

    expect(mockEntrarNaConversa).toHaveBeenCalledWith("c1");
    expect(mockMarcarComoLidas).toHaveBeenCalledWith("c1");

    await act(async () => {
      unmount();
    });
    expect(mockSairDaConversa).toHaveBeenCalledWith("c1");
  });

  it("falha no carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListarMensagens.mockRejectedValue(erro);
    const { findByText } = await renderTela();

    expect(await findByText("Não foi possível carregar esta conversa")).toBeTruthy();
  });

  describe("enviar mensagem", () => {
    it("botão desabilitado com o campo vazio", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      const { getByRole, findByText } = await renderTela();
      await findByText(/Diga olá/);

      expect(getByRole("button", { name: "Enviar" }).props.accessibilityState.disabled).toBe(true);
    });

    it("sucesso: chama enviarMensagem, acrescenta a mensagem na lista e limpa o campo", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      mockEnviarMensagem.mockResolvedValue(mensagem({ id: "m2", remetenteId: "u1", conteudo: "Olá, tudo bem?" }));
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText(/Diga olá/);

      await act(async () => {
        fireEvent.changeText(getByLabelText("Escreva uma mensagem"), "Olá, tudo bem?");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Enviar" }));
      });

      expect(mockEnviarMensagem).toHaveBeenCalledWith("c1", "Olá, tudo bem?");
      expect(await findByText("Olá, tudo bem?")).toBeTruthy();
      expect(getByLabelText("Escreva uma mensagem").props.value).toBe("");
    });

    it("erro ao enviar mostra mensagem amigável e mantém o texto digitado", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockEnviarMensagem.mockRejectedValue(erro);
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText(/Diga olá/);

      await act(async () => {
        fireEvent.changeText(getByLabelText("Escreva uma mensagem"), "Teste");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Enviar" }));
      });

      expect(await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.")).toBeTruthy();
      expect(getByLabelText("Escreva uma mensagem").props.value).toBe("Teste");
    });

    it("digitar emite 'mensagem:digitando' a cada mudança", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      const { getByLabelText, findByText } = await renderTela();
      await findByText(/Diga olá/);

      await act(async () => {
        fireEvent.changeText(getByLabelText("Escreva uma mensagem"), "O");
      });

      expect(mockEmitirDigitando).toHaveBeenCalledWith("c1", true);
    });
  });

  describe("tempo real", () => {
    it("'mensagem:nova' desta conversa vinda de OUTRO participante recarrega a lista e marca como lida de novo", async () => {
      mockListarMensagens.mockResolvedValueOnce(envelope([]));
      const capturados = prepararCapturaDeEventos();
      const { findByText } = await renderTela();
      await findByText(/Diga olá/);
      mockMarcarComoLidas.mockClear();

      mockListarMensagens.mockResolvedValueOnce(envelope([mensagem()]));
      await act(async () => {
        capturados["mensagem:nova"]?.({ conversaId: "c1", mensagem: mensagem() });
      });

      expect(await findByText("Oi!")).toBeTruthy();
      expect(mockMarcarComoLidas).toHaveBeenCalledWith("c1");
    });

    it("'mensagem:nova' da MINHA própria mensagem (eco) é ignorada — não recarrega de novo", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      const capturados = prepararCapturaDeEventos();
      const { findByText } = await renderTela();
      await findByText(/Diga olá/);

      const chamadasAntes = mockListarMensagens.mock.calls.length;
      await act(async () => {
        capturados["mensagem:nova"]?.({ conversaId: "c1", mensagem: mensagem({ remetenteId: "u1" }) });
      });

      expect(mockListarMensagens).toHaveBeenCalledTimes(chamadasAntes);
    });

    it("'mensagem:nova' de OUTRA conversa é ignorada", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      const capturados = prepararCapturaDeEventos();
      const { findByText } = await renderTela();
      await findByText(/Diga olá/);

      const chamadasAntes = mockListarMensagens.mock.calls.length;
      await act(async () => {
        capturados["mensagem:nova"]?.({ conversaId: "outra-conversa", mensagem: mensagem() });
      });

      expect(mockListarMensagens).toHaveBeenCalledTimes(chamadasAntes);
    });

    it("'mensagem:lida' do outro participante mostra 'Visto' na minha última mensagem", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      mockEnviarMensagem.mockResolvedValue(mensagem({ id: "m2", remetenteId: "u1", conteudo: "Oi, tudo bem?" }));
      const capturados = prepararCapturaDeEventos();
      const { getByRole, getByLabelText, findByText, queryByText } = await renderTela();
      await findByText(/Diga olá/);

      await act(async () => {
        fireEvent.changeText(getByLabelText("Escreva uma mensagem"), "Oi, tudo bem?");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Enviar" }));
      });
      await findByText("Oi, tudo bem?");
      expect(queryByText(/Visto/)).toBeNull();

      await act(async () => {
        capturados["mensagem:lida"]?.({ conversaId: "c1", usuarioId: "u2" });
      });

      expect(await findByText(/Visto/)).toBeTruthy();
    });

    it("'mensagem:digitando' do outro participante mostra o indicador, e o timeout de 3s agendado o limpa sozinho", async () => {
      // `jest.advanceTimersByTime` não é confiável neste preset RN+Jest para
      // um `setTimeout` já agendado (a instalação de fake timers não afeta
      // timers do runtime RN de forma consistente aqui): em vez de tentar
      // avançar o relógio, captura o próprio callback agendado via spy em
      // `setTimeout` e o invoca diretamente. Isso testa exatamente a mesma
      // coisa (o que acontece quando o timeout de fato dispara), sem
      // depender de avançar tempo de verdade ou fake.
      const setTimeoutSpy = jest.spyOn(globalThis, "setTimeout");
      mockListarMensagens.mockResolvedValue(envelope([]));
      const capturados = prepararCapturaDeEventos();
      const { findByText, queryByText } = await renderTela();
      await findByText(/Diga olá/);

      await act(async () => {
        capturados["mensagem:digitando"]?.({ conversaId: "c1", usuarioId: "u2", digitando: true });
      });
      expect(await findByText(/está digitando/)).toBeTruthy();

      const chamadaComTresSegundos = setTimeoutSpy.mock.calls.find((chamada) => chamada[1] === 3000);
      const callback = chamadaComTresSegundos?.[0] as (() => void) | undefined;
      expect(callback).toBeDefined();

      await act(async () => {
        callback?.();
      });
      expect(queryByText(/está digitando/)).toBeNull();

      setTimeoutSpy.mockRestore();
    });

    it("'mensagem:digitando' de mim mesmo é ignorado", async () => {
      mockListarMensagens.mockResolvedValue(envelope([]));
      const capturados = prepararCapturaDeEventos();
      const { findByText, queryByText } = await renderTela();
      await findByText(/Diga olá/);

      await act(async () => {
        capturados["mensagem:digitando"]?.({ conversaId: "c1", usuarioId: "u1", digitando: true });
      });

      expect(queryByText(/está digitando/)).toBeNull();
    });
  });
});
