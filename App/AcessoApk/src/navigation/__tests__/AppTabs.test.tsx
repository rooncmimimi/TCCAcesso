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

  it("abre na aba Home mostrando o shell da Home", async () => {
    const { findByText } = await renderTabs();
    expect(await findByText("Aqui ficará o feed do ACESSO.")).toBeTruthy();
  });

  it("as cinco abas existem e têm accessibilityLabel de navegação", async () => {
    const { getByLabelText } = await renderTabs();
    expect(getByLabelText("Página inicial")).toBeTruthy();
    expect(getByLabelText("Vagas")).toBeTruthy();
    expect(getByLabelText("Mensagens")).toBeTruthy();
    expect(getByLabelText("Notificações")).toBeTruthy();
    expect(getByLabelText("Perfil")).toBeTruthy();
  });

  it("aba Vagas mostra o shell de Vagas", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    expect(await findByText("Aqui ficarão as oportunidades profissionais do ACESSO.")).toBeTruthy();
  });

  it("aba Mensagens mostra o shell de Mensagens", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Mensagens"));
    });
    expect(await findByText("Aqui ficarão suas conversas.")).toBeTruthy();
  });

  it("aba Notificações mostra o shell de Notificações", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Notificações"));
    });
    expect(await findByText("Aqui aparecerão suas notificações.")).toBeTruthy();
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
