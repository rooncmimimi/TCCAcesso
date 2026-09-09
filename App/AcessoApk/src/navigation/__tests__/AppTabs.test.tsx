/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockLogout = jest.fn();

jest.mock("../../auth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    isAuthenticated: true,
    isLoading: false,
    sessionEndedReason: null,
    login: jest.fn(),
    logout: mockLogout,
    clearSessionEndedReason: jest.fn(),
  }),
}));

// Fase 9: `JobsScreen` deixou de ser o placeholder — agora busca vagas de
// verdade ao montar, então precisa de um mock de `VagasService` só pra este
// arquivo não depender do backend (o comportamento real da tela já tem sua
// própria suíte em `screens/__tests__/JobsScreen.test.tsx`; aqui só importa
// confirmar que a ABA em si abre a tela certa).
jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, vagas: [] }),
  },
}));

// Fase 10: mesmo raciocínio acima, agora para `HomeScreen`/`FeedService` —
// o comportamento real do feed já tem sua própria suíte em
// `screens/__tests__/HomeScreen.test.tsx`.
jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    listar: jest
      .fn()
      .mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, postagens: [] }),
  },
}));

// Fase 16: mesmo raciocínio acima, agora para `NotificationsScreen`/
// `NotificacaoService` — o comportamento real da tela já tem sua própria
// suíte em `screens/__tests__/NotificationsScreen.test.tsx`. `AppTabs`
// também chama `contarNaoLidas` (selo da aba), por isso o mock cobre os
// dois métodos usados fora da tela.
jest.mock("../../notificacoes", () => ({
  ...jest.requireActual("../../notificacoes"),
  NotificacaoService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, notificacoes: [] }),
    contarNaoLidas: jest.fn().mockResolvedValue(0),
  },
}));

// Fase 17: mesmo raciocínio acima, agora para `MessagesScreen`/
// `ConversaService` — o comportamento real da tela já tem sua própria
// suíte em `screens/__tests__/MessagesScreen.test.tsx`. `ouvirEvento`
// também é mockado para não tentar abrir um socket de verdade neste teste.
jest.mock("../../mensagens", () => ({
  ...jest.requireActual("../../mensagens"),
  ConversaService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 20, totalPaginas: 0, conversas: [] }),
  },
}));

jest.mock("../../services/socket/socketClient", () => ({
  ouvirEvento: jest.fn(() => () => undefined),
}));

import { NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { AppTabs } from "../AppTabs";

// `AccessibilityProvider` (Fase 5) é obrigatório: `ThemeProvider` lê
// preferências dele e renderiza `null` até a leitura inicial do
// AsyncStorage mockado terminar.
async function renderTabs() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <NavigationContainer>
          <AppTabs />
        </NavigationContainer>
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("AppTabs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("abre na aba Home mostrando o feed de verdade (Fase 10, não mais o placeholder)", async () => {
    const { findByText } = await renderTabs();
    expect(await findByText("Nenhuma publicação ainda")).toBeTruthy();
  });

  it("as cinco abas existem e têm accessibilityLabel de navegação", async () => {
    const { getByLabelText } = await renderTabs();
    expect(getByLabelText("Página inicial")).toBeTruthy();
    expect(getByLabelText("Vagas")).toBeTruthy();
    expect(getByLabelText("Mensagens")).toBeTruthy();
    expect(getByLabelText("Notificações")).toBeTruthy();
    expect(getByLabelText("Perfil")).toBeTruthy();
  });

  it("aba Vagas abre a tela real de listagem (Fase 9, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    expect(await findByText("Nenhuma vaga encontrada")).toBeTruthy();
  });

  it("aba Mensagens mostra a tela real de Mensagens (Fase 17, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Mensagens"));
    });
    expect(await findByText("Nenhuma conversa ainda")).toBeTruthy();
  });

  it("aba Notificações mostra a tela real de Notificações (Fase 16, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Notificações"));
    });
    expect(await findByText("Nenhuma notificação ainda")).toBeTruthy();
  });

  it("selo da aba Notificações mostra a contagem de não lidas ao montar", async () => {
    const { NotificacaoService } = jest.requireMock("../../notificacoes") as {
      NotificacaoService: { contarNaoLidas: jest.Mock };
    };
    NotificacaoService.contarNaoLidas.mockResolvedValue(3);

    const { findByText } = await renderTabs();

    expect(await findByText("3")).toBeTruthy();
  });

  it("sem não lidas, a aba Notificações não mostra selo", async () => {
    const { NotificacaoService } = jest.requireMock("../../notificacoes") as {
      NotificacaoService: { contarNaoLidas: jest.Mock };
    };
    NotificacaoService.contarNaoLidas.mockResolvedValue(0);

    const { queryByText } = await renderTabs();
    await waitFor(() => expect(NotificacaoService.contarNaoLidas).toHaveBeenCalled());

    expect(queryByText("0")).toBeNull();
  });

  it("aba Perfil mostra o menu do perfil (não uma tela única)", async () => {
    const { getByLabelText, findByLabelText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Perfil"));
    });
    expect(await findByLabelText("Sair da conta")).toBeTruthy();
    expect(await findByLabelText("Configurações")).toBeTruthy();
  });
});
