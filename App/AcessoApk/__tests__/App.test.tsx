/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
/**
 * Fase 23 ("Testes avançados") — o mais próximo de um E2E de verdade que
 * este ambiente permite (sem SDK Android/emulador, um Maestro de verdade
 * não roda aqui — ver `.maestro/README.md`). Renderiza o `App` exportado de
 * verdade (`SafeAreaProvider`/`AccessibilityProvider`/`ThemeProvider`/
 * `SegurancaProvider`/`RootNavigator` reais) — nenhum teste existente até
 * agora fazia isso (todos montam uma tela ou um navegador isolado). O que É
 * mockado: a camada de serviço (HTTP) e os dois módulos nativos que só esta
 * árvore completa realmente exercita (`react-native-safe-area-context`,
 * cujos insets nunca resolvem sem o mock oficial da própria biblioteca —
 * achado ao escrever este teste, documentado abaixo).
 *
 * `useAuth()` é mockado com um estado compartilhado de verdade (mesma
 * técnica de `RootNavigator.test.tsx` — `useSyncExternalStore`, não um
 * `useState` local: `login()` chamado a partir do `LoginScreen` precisa
 * atualizar o que `RootNavigator` está lendo, senão a tela nunca troca).
 */
import { useSyncExternalStore } from "react";

type EstadoAuthFalso = {
  status: "unauthenticated" | "authenticated";
  user: Record<string, unknown> | null;
};

let mockEstadoAuth: EstadoAuthFalso = { status: "unauthenticated", user: null };
const mockOuvintesAuth = new Set<() => void>();

function mockDefinirEstadoAuth(novo: Partial<EstadoAuthFalso>) {
  mockEstadoAuth = { ...mockEstadoAuth, ...novo };
  mockOuvintesAuth.forEach((ouvinte) => ouvinte());
}

const mockLogin = jest.fn();
const mockLogout = jest.fn();

function mockUseAuthFalso() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- nome começa com "mock", não "use": permitido dentro do factory de `jest.mock` (hoisted), ver mesma técnica em `RootNavigator.test.tsx`.
  const estado = useSyncExternalStore(
    (ouvinte) => {
      mockOuvintesAuth.add(ouvinte);
      return () => mockOuvintesAuth.delete(ouvinte);
    },
    () => mockEstadoAuth,
  );

  return {
    status: estado.status,
    user: estado.user,
    isAuthenticated: estado.status === "authenticated",
    isLoading: false,
    sessionEndedReason: null,
    login: async (credenciais: unknown) => mockLogin(credenciais),
    logout: async () => mockLogout(),
    clearSessionEndedReason: () => {},
  };
}

jest.mock("../src/auth", () => ({
  ...jest.requireActual("../src/auth"),
  useAuth: () => mockUseAuthFalso(),
  AuthService: { reenviarConfirmacao: jest.fn(), esqueciSenha: jest.fn(), redefinirSenha: jest.fn() },
}));

// `useAuth()` acima é totalmente substituído (estado compartilhado falso),
// mas o `AuthProvider` REAL continua montado por baixo (`App.tsx` o
// renderiza sem condição nenhuma, e este arquivo nunca mockou o componente
// em si) — seu próprio efeito de restauração de sessão chama
// `SecureStore.getItemAsync` de verdade ao montar. Sem mock, isso lançaria
// (não existe módulo nativo no Jest) e poluiria o teste com uma rejeição
// não tratada, mesmo o valor nunca sendo lido por ninguém (RootNavigator
// só enxerga o `useAuth()` falso acima).
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

// `App.tsx` é a ÚNICA árvore de teste desta suíte inteira que renderiza o
// `SafeAreaProvider` de verdade (todo outro arquivo monta uma tela sozinha,
// sem ele) — sem o mock oficial da própria biblioteca, os insets nunca
// resolvem no ambiente do Jest (não existe o evento nativo que os
// preenche) e a árvore inteira fica presa sem renderizar nenhum filho.
// `.default`: o mock da biblioteca só tem export default (achado ao
// escrever este teste — sem o `.default`, `SafeAreaProvider` vira
// `undefined` e o React lança "Element type is invalid").
// eslint-disable-next-line @typescript-eslint/no-require-imports -- factory de `jest.mock` roda antes de qualquer import ES (hoisted), precisa de `require` mesmo.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Sem hardware biométrico disponível — `SegurancaProvider` nunca mostra
// `BiometricLockScreen` neste teste (não é o que está sendo verificado
// aqui; já tem cobertura própria em `RootNavigator.test.tsx`).
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn(),
}));

const mockListarFeed = jest.fn();
jest.mock("../src/feed", () => ({
  ...jest.requireActual("../src/feed"),
  FeedService: { listar: (...a: unknown[]) => mockListarFeed(...a) },
}));

const mockListarVagas = jest.fn();
const mockObterVagaPorId = jest.fn();
const mockFavoritarVaga = jest.fn();
jest.mock("../src/vagas", () => ({
  ...jest.requireActual("../src/vagas"),
  VagasService: {
    listar: (...a: unknown[]) => mockListarVagas(...a),
    obterPorId: (...a: unknown[]) => mockObterVagaPorId(...a),
    favoritar: (...a: unknown[]) => mockFavoritarVaga(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../App";

const candidatoLogado = {
  id: "u1",
  nome: "Ana Candidata",
  email: "ana@exemplo.com",
  tipoUsuario: "candidato",
  perfilPublico: true,
  preferenciaMensagens: "todos",
};

const vagaExemplo = {
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "Vaga de teste para o percurso completo.",
  modalidade: "Remoto",
  cidade: "São Paulo",
  estado: "SP",
  status: "Aberta",
  empresa: { id: "e1", nomeFantasia: "ACME" },
};

// Mesmo rótulo que `VagaListItem` (`JobsScreen.tsx`) monta de verdade —
// conferida a construção exata (`[titulo, empresa, local, modalidade,
// publicoAlvo].filter(Boolean).join(", ")`) antes de escrever este teste.
const ROTULO_VAGA = "Desenvolvedor Front-end, ACME, São Paulo - SP, Remoto";

async function renderApp() {
  const utils = await render(<App />);
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("App — percurso completo (login real → feed → Vagas → detalhe → favoritar / logout)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEstadoAuth = { status: "unauthenticated", user: null };
    mockListarFeed.mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, postagens: [] });
    mockListarVagas.mockResolvedValue({
      sucesso: true,
      total: 1,
      pagina: 1,
      limite: 10,
      totalPaginas: 1,
      vagas: [vagaExemplo],
    });
    mockObterVagaPorId.mockResolvedValue(vagaExemplo);
  });

  it("login pelo formulário leva ao feed; navega para Vagas, abre uma vaga (composite Tab→Stack) e favorita", async () => {
    mockLogin.mockImplementation(async () => {
      mockDefinirEstadoAuth({ status: "authenticated", user: candidatoLogado });
      return { sucesso: true, token: "tok-fake", refreshToken: "ref-fake", usuario: candidatoLogado };
    });
    mockFavoritarVaga.mockResolvedValue(true);

    const { getByLabelText, getByRole, findByText, findByLabelText, queryByLabelText } = await renderApp();

    // 1. Tela de login real — digita e envia.
    expect(await findByText("Entrar")).toBeTruthy();
    await act(async () => {
      fireEvent.changeText(getByLabelText("E-mail"), "ana@exemplo.com");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Senha"), "SenhaValida123!");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Entrar" }));
    });

    expect(mockLogin).toHaveBeenCalledWith({ email: "ana@exemplo.com", senha: "SenhaValida123!" });

    // 2. Sessão "authenticated" — RootNavigator troca pro App Stack, Home carrega o feed real (vazio).
    expect(await findByText("Olá, Ana Candidata!")).toBeTruthy();
    expect(queryByLabelText("E-mail")).toBeNull();

    // 3. Aba Vagas — composite navigation Tab → Stack pai (VagaDetail não é uma rota da própria tab, mora em AppStackParamList).
    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    // O rótulo é o `accessibilityLabel` do card inteiro — o texto visível
    // vem em `Text`s SEPARADOS (título/empresa/local), então `findByText`
    // com a string completa nunca bateria; é `findByLabelText` que
    // corresponde ao nó único e acessível (achado ao escrever este teste).
    const itemVaga = await findByLabelText(ROTULO_VAGA);
    await act(async () => {
      fireEvent.press(itemVaga);
    });

    // 4. Detalhe real da vaga, fora do Tab.Navigator.
    expect(await findByText("Vaga de teste para o percurso completo.")).toBeTruthy();
    expect(mockObterVagaPorId).toHaveBeenCalledWith("v1");

    // 5. Favoritar — chama o serviço real, atualiza o rótulo/estado.
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Favoritar vaga" }));
    });
    expect(mockFavoritarVaga).toHaveBeenCalledWith("v1");
    expect(await findByText("Favoritado")).toBeTruthy();
  });

  it("do Perfil, 'Sair da conta' encerra a sessão e volta à tela de login", async () => {
    mockLogin.mockImplementation(async () => {
      mockDefinirEstadoAuth({ status: "authenticated", user: candidatoLogado });
      return { sucesso: true, token: "tok-fake", refreshToken: "ref-fake", usuario: candidatoLogado };
    });
    mockLogout.mockImplementation(async () => {
      mockDefinirEstadoAuth({ status: "unauthenticated", user: null });
    });

    const { getByLabelText, getByRole, findByText, findByLabelText, getByText, queryByLabelText } = await renderApp();

    await act(async () => {
      fireEvent.changeText(getByLabelText("E-mail"), "ana@exemplo.com");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Senha"), "SenhaValida123!");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Entrar" }));
    });
    await findByText("Olá, Ana Candidata!");

    await act(async () => {
      fireEvent.press(getByLabelText("Perfil"));
    });
    const botaoSair = await findByLabelText("Sair da conta");
    await act(async () => {
      fireEvent.press(botaoSair);
    });

    // Sessão encerrada — RootNavigator troca de volta pro ramo "Auth"
    // (descarta a pilha do App inteira, mesmo mecanismo já documentado em
    // `RootNavigator.tsx`) — nada do App restante fica acessível.
    await waitFor(() => expect(getByLabelText("E-mail")).toBeTruthy());
    expect(queryByLabelText("Página inicial")).toBeNull();
    expect(getByText("Entrar")).toBeTruthy();
    expect(mockLogout).toHaveBeenCalled();
  });

  it("login com credenciais inválidas mostra o erro real do backend e permanece na tela de login", async () => {
    const erro = Object.assign(new Error("401"), {
      isAxiosError: true,
      response: { data: { mensagem: "E-mail ou senha inválidos." } },
    });
    mockLogin.mockRejectedValue(erro);

    const { getByLabelText, getByRole, findByText } = await renderApp();

    await act(async () => {
      fireEvent.changeText(getByLabelText("E-mail"), "ana@exemplo.com");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Senha"), "SenhaErrada");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Entrar" }));
    });

    expect(await findByText("E-mail ou senha inválidos.")).toBeTruthy();
    expect(getByLabelText("E-mail")).toBeTruthy();
  });
});
