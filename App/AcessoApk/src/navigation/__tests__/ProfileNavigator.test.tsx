/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../auth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    isAuthenticated: true,
    isLoading: false,
    sessionEndedReason: null,
    login: jest.fn(),
    logout: jest.fn(),
    clearSessionEndedReason: jest.fn(),
  }),
}));

import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { ProfileNavigator } from "../ProfileNavigator";

// O header/botão "Voltar" do native-stack é desenhado nativamente por
// `react-native-screens` — no ambiente de teste ele aparece só como um nó de
// configuração (`RNSScreenStackHeaderConfig`), sem um elemento consultável
// com `accessibilityLabel`. Por isso o "voltar" é testado chamando
// `goBack()` pela ref do próprio `NavigationContainer` em vez de procurar um
// botão na árvore — é exatamente a mesma ação que o header nativo e o botão
// físico/gestual do Android disparam por baixo (ambos chamam `goBack()` na
// pilha atual), então isto testa o comportamento real da pilha.
const navigationRef = createNavigationContainerRef();

// `AccessibilityProvider` (Fase 5) é obrigatório: `ThemeProvider` lê
// preferências dele e renderiza `null` até a leitura inicial do
// AsyncStorage mockado terminar.
async function renderProfileStack() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <NavigationContainer ref={navigationRef}>
          <ProfileNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ProfileNavigator", () => {
  it("abre no menu do Perfil, mostrando os dados do usuário e os itens do menu", async () => {
    const { findByText, getByLabelText } = await renderProfileStack();
    expect(await findByText("Ana")).toBeTruthy();
    expect(getByLabelText("Meu perfil")).toBeTruthy();
    expect(getByLabelText("Atividades")).toBeTruthy();
    expect(getByLabelText("Descobrir")).toBeTruthy();
    expect(getByLabelText("Configurações")).toBeTruthy();
    expect(getByLabelText("Acessibilidade")).toBeTruthy();
    expect(getByLabelText("Ajuda")).toBeTruthy();
  });

  it("Perfil → Configurações empilha a tela de Configurações", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Configurações"));
    });
    expect(await findByText("Aqui ficarão as configurações da sua conta.")).toBeTruthy();
  });

  it("Perfil → Acessibilidade empilha a tela real de Acessibilidade (Fase 6, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Acessibilidade"));
    });
    expect(await findByText("Personalize sua experiência")).toBeTruthy();
  });

  it("Perfil → Ajuda empilha a tela de Ajuda", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Ajuda"));
    });
    expect(await findByText("Aqui ficarão as respostas para as dúvidas mais comuns.")).toBeTruthy();
  });

  it("Perfil → Configurações → voltar retorna ao menu do Perfil (não sai do app)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();

    await act(async () => {
      fireEvent.press(getByLabelText("Configurações"));
    });
    expect(await findByText("Aqui ficarão as configurações da sua conta.")).toBeTruthy();

    await act(async () => {
      navigationRef.current?.goBack();
    });

    expect(await findByText("Ana")).toBeTruthy();
  });
});
