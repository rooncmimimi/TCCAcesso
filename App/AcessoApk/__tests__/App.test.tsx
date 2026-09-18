/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
/**
 * O teste mais próximo de um E2E que roda sem emulador: renderiza o `App` real, com todos os
 * providers e o `RaizNavigator`, e percorre login, feed, vagas e saída da conta. Só a camada de
 * serviços (HTTP) e os módulos nativos são mockados.
 *
 * `useAutenticacao()` vira um estado compartilhado com `useSyncExternalStore` (mesma técnica de
 * `RaizNavigator.test.tsx`), para que o `login()` chamado pela tela de entrada atualize o que o
 * `RaizNavigator` lê.
 */
import { useSyncExternalStore } from "react";

type EstadoAuthFalso = {
  status: "naoAutenticado" | "autenticado";
  usuario: Record<string, unknown> | null;
};

let mockEstadoAuth: EstadoAuthFalso = { status: "naoAutenticado", usuario: null };
const mockOuvintesAuth = new Set<() => void>();

function mockDefinirEstadoAuth(novo: Partial<EstadoAuthFalso>) {
  mockEstadoAuth = { ...mockEstadoAuth, ...novo };
  mockOuvintesAuth.forEach((ouvinte) => ouvinte());
}

const mockLogin = jest.fn();
const mockLogout = jest.fn();

function mockUseAuthFalso() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- nome começa com "mock", não "use": permitido dentro do factory de `jest.mock` (hoisted), ver mesma técnica em `RaizNavigator.test.tsx`.
  const estado = useSyncExternalStore(
    (ouvinte) => {
      mockOuvintesAuth.add(ouvinte);
      return () => mockOuvintesAuth.delete(ouvinte);
    },
    () => mockEstadoAuth,
  );

  return {
    status: estado.status,
    usuario: estado.usuario,
    autenticado: estado.status === "autenticado",
    carregando: false,
    motivoFimSessao: null,
    entrar: async (credenciais: unknown) => mockLogin(credenciais),
    sair: async () => mockLogout(),
    limparMotivoFimSessao: () => {},
  };
}

jest.mock("../src/autenticacao", () => ({
  ...jest.requireActual("../src/autenticacao"),
  useAutenticacao: () => mockUseAuthFalso(),
  AutenticacaoService: { reenviarConfirmacao: jest.fn(), esqueciSenha: jest.fn(), redefinirSenha: jest.fn() },
}));

// O `AutenticacaoProvider` real continua montado pelo `App` e tenta restaurar a sessão pelo
// SecureStore. Sem este mock a chamada lançaria no Jest, mesmo que ninguém leia o resultado.
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

// Este é o único teste que monta o `SafeAreaProvider` real. Sem o mock oficial da biblioteca, os
// insets nunca resolvem no Jest e nada é renderizado; o mock só tem export default, daí o
// `.default`.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- factory de `jest.mock` roda antes de qualquer import ES (hoisted), precisa de `require` mesmo.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Sem biometria disponível, o bloqueio nunca aparece aqui; ele tem cobertura própria em
// `RaizNavigator.test.tsx`.
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
  modalidade: "remoto",
  cidade: "São Paulo",
  estado: "SP",
  status: "aberta",
  empresa: { id: "e1", nomeFantasia: "ACME" },
};

// Mesmo `accessibilityLabel` que `ItemVaga` monta em `VagasScreen.tsx`: título, empresa, local,
// modalidade e, quando houver, salário e público-alvo.
const ROTULO_VAGA = "Desenvolvedor Front-end, ACME, São Paulo - SP, Remoto";

async function renderApp() {
  const utils = await render(<App />);
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("App — percurso completo (login real → feed → Vagas → detalhe → favoritar / logout)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEstadoAuth = { status: "naoAutenticado", usuario: null };
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
      mockDefinirEstadoAuth({ status: "autenticado", usuario: candidatoLogado });
      return { sucesso: true, token: "tok-fake", refreshToken: "ref-fake", usuario: candidatoLogado };
    });
    mockFavoritarVaga.mockResolvedValue(true);

    const { getByLabelText, getByRole, findByText, findByLabelText, queryByLabelText } = await renderApp();

    // 1. Tela de login real: digita e envia.
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

    // 2. Sessão "autenticado": RaizNavigator troca pro App Stack, Home carrega o feed real (vazio).
    expect(await findByText("Olá, Ana Candidata!")).toBeTruthy();
    expect(queryByLabelText("E-mail")).toBeNull();

    // 3. Aba Vagas. O detalhe da vaga não é uma rota da aba: fica na pilha principal
    // (`AppStackParamList`).
    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    // O rótulo completo é o `accessibilityLabel` do card; o texto visível fica em vários `Text`
    // separados, então só `findByLabelText` encontra o card inteiro.
    const itemVaga = await findByLabelText(ROTULO_VAGA);
    await act(async () => {
      fireEvent.press(itemVaga);
    });

    // 4. Detalhe real da vaga, fora do Tab.Navigator.
    expect(await findByText("Vaga de teste para o percurso completo.")).toBeTruthy();
    expect(mockObterVagaPorId).toHaveBeenCalledWith("v1");

    // 5. Favoritar: chama o serviço real, atualiza o rótulo/estado.
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Favoritar vaga" }));
    });
    expect(mockFavoritarVaga).toHaveBeenCalledWith("v1");
    expect(await findByText("Favoritado")).toBeTruthy();
  });

  it("do Perfil, 'Sair da conta' encerra a sessão e volta à tela de login", async () => {
    mockLogin.mockImplementation(async () => {
      mockDefinirEstadoAuth({ status: "autenticado", usuario: candidatoLogado });
      return { sucesso: true, token: "tok-fake", refreshToken: "ref-fake", usuario: candidatoLogado };
    });
    mockLogout.mockImplementation(async () => {
      mockDefinirEstadoAuth({ status: "naoAutenticado", usuario: null });
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

    // Sessão encerrada: o `RaizNavigator` volta para as telas de entrada e descarta a pilha do app.
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
