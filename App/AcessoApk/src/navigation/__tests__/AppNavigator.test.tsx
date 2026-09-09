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

const vagaMock = {
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "Descrição completa da vaga.",
  modalidade: "Remoto",
  status: "Aberta",
  empresa: { id: "e1", nomeFantasia: "ACME" },
};

jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, vagas: [vagaMock] }),
    obterPorId: jest.fn().mockResolvedValue(vagaMock),
  },
}));

// Fase 10: `AppNavigator` monta `AppTabs`, que monta `HomeScreen` (agora
// buscando o feed de verdade ao montar) — sem este mock, o teste chamaria a
// API real.
jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    listar: jest
      .fn()
      .mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, postagens: [] }),
  },
}));

import { createNavigationContainerRef, getStateFromPath, NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { AppNavigator } from "../AppNavigator";
import { linking } from "../linking";

// Mesma técnica de `ProfileNavigator.test.tsx` — o header/botão "voltar" do
// native-stack é desenhado nativamente (`react-native-screens`), sem um nó
// consultável com accessibilityLabel no ambiente de teste; `goBack()` pela
// ref do `NavigationContainer` dispara exatamente a mesma ação da pilha.
const navigationRef = createNavigationContainerRef();

async function renderApp() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("AppNavigator — Jobs → VagaDetail", () => {
  it("Jobs → toca num item → empilha VagaDetail com o header themed e o conteúdo real", async () => {
    const { getByLabelText, getByRole, findByText } = await renderApp();

    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    const item = await waitFor(() => getByRole("button", { name: /Desenvolvedor Front-end/ }));

    await act(async () => {
      fireEvent.press(item);
    });

    expect(await findByText("Descrição completa da vaga.")).toBeTruthy();
  });

  it("VagaDetail → voltar (goBack) retorna à lista de Vagas, sem duplicar telas na pilha", async () => {
    const { getByLabelText, getByRole, findByText } = await renderApp();

    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    const item = await waitFor(() => getByRole("button", { name: /Desenvolvedor Front-end/ }));
    await act(async () => {
      fireEvent.press(item);
    });
    await findByText("Descrição completa da vaga.");

    await act(async () => {
      navigationRef.current?.goBack();
    });

    // De volta à lista: o contador da lista reaparece (só existe na tela de Vagas, não no detalhe).
    expect(await findByText("1 vaga encontrada")).toBeTruthy();
  });
});

describe("linking — deep link acesso://vagas/:vagaId (Fase 9, resolve a pendência da Fase 4)", () => {
  it("getStateFromPath resolve /vagas/123 para a rota VagaDetail com vagaId '123'", () => {
    const estado = getStateFromPath("/vagas/123", linking.config);
    const serializado = JSON.stringify(estado);

    expect(serializado).toContain("VagaDetail");
    expect(serializado).toContain('"vagaId":"123"');
  });

  it("continua resolvendo /vagas (lista) para a aba Jobs, sem quebrar o link já existente", () => {
    const estado = getStateFromPath("/vagas", linking.config);
    const serializado = JSON.stringify(estado);

    expect(serializado).toContain("Jobs");
  });
});
