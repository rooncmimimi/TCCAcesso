/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockListar = jest.fn();
const mockOuvirEvento = jest.fn();

jest.mock("../../mensagens", () => ({
  ...jest.requireActual("../../mensagens"),
  ConversaService: {
    listar: (...args: unknown[]) => mockListar(...args),
  },
}));

jest.mock("../../services/socket/socketClient", () => ({
  ouvirEvento: (...args: unknown[]) => mockOuvirEvento(...args),
}));

jest.mock("../../auth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    isAuthenticated: true,
    isLoading: false,
    sessionEndedReason: null,
    login: jest.fn(),
    logout: jest.fn(),
    clearSessionEndedReason: jest.fn(),
  }),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList, AppTabParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { MessagesScreen } from "../MessagesScreen";

const participante = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "u2",
  nome: "Beatriz Souza",
  fotoPerfil: null,
  tipoUsuario: "candidato",
  ...sobrescreve,
});

const conversa = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "c1",
  usuarioAId: "u1",
  usuarioBId: "u2",
  usuarioA: participante({ id: "u1", nome: "Ana" }),
  usuarioB: participante(),
  ultimaMensagem: "2026-01-01T10:00:00.000Z",
  mensagensNaoLidas: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T10:00:00.000Z",
  ...sobrescreve,
});

const envelope = (conversas: unknown[], extra: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  total: conversas.length,
  pagina: 1,
  limite: 20,
  totalPaginas: conversas.length > 0 ? 1 : 0,
  conversas,
  ...extra,
});

const mockNavigate = jest.fn();
const navigationMock = {
  navigate: mockNavigate,
} as unknown as NativeStackScreenProps<AppStackParamList, "Tabs">["navigation"] &
  NativeStackScreenProps<AppTabParamList, "Messages">["navigation"];

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        {/* @ts-expect-error -- route não é usado pela tela, só navigation; mock mínimo de propósito. */}
        <MessagesScreen navigation={navigationMock} route={{ key: "Messages", name: "Messages" }} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("MessagesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOuvirEvento.mockReturnValue(() => undefined);
  });

  it("mostra loading no primeiro carregamento, depois a lista com o OUTRO participante", async () => {
    mockListar.mockResolvedValue(envelope([conversa()]));
    const { findByText } = await renderTela();

    expect(await findByText("Beatriz Souza")).toBeTruthy();
    expect(mockListar).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("quando EU sou usuarioB, mostra usuarioA como o outro participante (nunca presume qual campo é 'o outro')", async () => {
    mockListar.mockResolvedValue(
      envelope([
        conversa({
          usuarioAId: "u3",
          usuarioBId: "u1",
          usuarioA: participante({ id: "u3", nome: "Carlos" }),
          usuarioB: participante({ id: "u1", nome: "Ana" }),
        }),
      ]),
    );
    const { findByText, queryByText } = await renderTela();

    expect(await findByText("Carlos")).toBeTruthy();
    expect(queryByText("Ana")).toBeNull();
  });

  it("participante removido (usuarioB null) mostra 'Usuário removido'", async () => {
    mockListar.mockResolvedValue(envelope([conversa({ usuarioBId: null, usuarioB: null })]));
    const { findByText } = await renderTela();

    expect(await findByText("Usuário removido")).toBeTruthy();
  });

  it("empresa: mostra o nome fantasia, não o nome do usuário dono", async () => {
    mockListar.mockResolvedValue(
      envelope([
        conversa({
          usuarioB: participante({
            id: "u2",
            nome: "Dono da Empresa",
            tipoUsuario: "empresa",
            empresa: { id: "e1", nomeFantasia: "ACME", razaoSocial: "ACME Ltda", logo: null },
          }),
        }),
      ]),
    );
    const { findByText, queryByText } = await renderTela();

    expect(await findByText("ACME")).toBeTruthy();
    expect(queryByText("Dono da Empresa")).toBeNull();
  });

  it("mostra o selo de mensagens não lidas quando > 0", async () => {
    mockListar.mockResolvedValue(envelope([conversa({ mensagensNaoLidas: 3 })]));
    const { findByText } = await renderTela();

    expect(await findByText("3")).toBeTruthy();
  });

  it("resposta vazia mostra o estado vazio", async () => {
    mockListar.mockResolvedValue(envelope([]));
    const { findByText } = await renderTela();

    expect(await findByText("Nenhuma conversa ainda")).toBeTruthy();
  });

  it("toque numa conversa navega para Conversation com conversaId e o nome do outro participante", async () => {
    mockListar.mockResolvedValue(envelope([conversa()]));
    const { getByRole } = await renderTela();

    const item = await waitFor(() => getByRole("button", { name: /Conversa com Beatriz Souza/ }));
    await act(async () => {
      fireEvent.press(item);
    });

    expect(mockNavigate).toHaveBeenCalledWith("Conversation", { conversaId: "c1", nomeOutroParticipante: "Beatriz Souza" });
  });

  it("falha no primeiro carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListar.mockRejectedValue(erro);
    const { findByText } = await renderTela();

    expect(await findByText("Não foi possível carregar suas conversas")).toBeTruthy();
  });

  describe("tempo real", () => {
    it("escuta 'mensagem:nova' e 'conversa:atualizada', recarregando a lista quando disparam", async () => {
      mockListar.mockResolvedValue(envelope([conversa()]));
      const capturados: Record<string, () => void> = {};
      mockOuvirEvento.mockImplementation((evento: string, handler: () => void) => {
        capturados[evento] = handler;
        return () => undefined;
      });
      const { findByText } = await renderTela();
      await findByText("Beatriz Souza");

      expect(mockListar).toHaveBeenCalledTimes(1);

      await act(async () => {
        capturados["mensagem:nova"]?.();
      });
      await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));

      await act(async () => {
        capturados["conversa:atualizada"]?.();
      });
      await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(3));
    });
  });

  describe("paginação incremental", () => {
    it("scroll até o fim (onEndReached) busca a próxima página e acumula", async () => {
      mockListar.mockResolvedValueOnce(envelope([conversa()], { totalPaginas: 2, total: 21 }));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      mockListar.mockResolvedValueOnce(
        envelope([conversa({ id: "c2", usuarioB: participante({ id: "u3", nome: "Carlos" }) })], { pagina: 2, totalPaginas: 2, total: 21 }),
      );
      await act(async () => {
        fireEvent(getByTestId("conversas-lista"), "onEndReached");
      });

      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 20 }));
      expect(await findByText("Carlos")).toBeTruthy();
    });

    it("não busca além da última página", async () => {
      mockListar.mockResolvedValue(envelope([conversa()], { pagina: 2, totalPaginas: 2, total: 21 }));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      await act(async () => {
        fireEvent(getByTestId("conversas-lista"), "onEndReached");
      });

      expect(mockListar).toHaveBeenCalledTimes(1);
    });

    it("deduplica por id entre páginas", async () => {
      mockListar.mockResolvedValueOnce(envelope([conversa()], { totalPaginas: 2, total: 2 }));
      const { getByTestId, findAllByText, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      mockListar.mockResolvedValueOnce(envelope([conversa()], { pagina: 2, totalPaginas: 2, total: 2 }));
      await act(async () => {
        fireEvent(getByTestId("conversas-lista"), "onEndReached");
      });

      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 20 }));
      expect(await findAllByText("Beatriz Souza")).toHaveLength(1);
    });
  });

  describe("pull-to-refresh", () => {
    it("puxar para atualizar refaz a página 1", async () => {
      mockListar.mockResolvedValueOnce(envelope([conversa()]));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      mockListar.mockResolvedValueOnce(envelope([conversa({ id: "c2", usuarioB: participante({ id: "u4", nome: "Nova Conversa" }) })]));
      const lista = getByTestId("conversas-lista");
      await act(async () => {
        lista.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 1, limit: 20 }));
      expect(await findByText("Nova Conversa")).toBeTruthy();
    });
  });
});
