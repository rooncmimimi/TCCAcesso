/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
import { useSyncExternalStore } from "react";

import type { StatusAutenticacao, UsuarioAutenticado, Credenciais, LoginResposta } from "../../autenticacao/types";

/**
 * Estado falso, mas de verdade compartilhado entre todos os componentes que
 * chamam `useAutenticacao()`: não um `useState` local dentro do mock (cada
 * chamador teria sua própria cópia independente do estado, e `login()`
 * chamado a partir do `EntrarScreen` nunca atualizaria o que o
 * `RaizNavigator` está lendo). `useSyncExternalStore` é o jeito correto e
 * oficial do React de expor um estado compartilhado fora da árvore de
 * componentes para um hook.
 */
let mockEstado: { status: StatusAutenticacao; usuario: UsuarioAutenticado | null } = { status: "carregando", usuario: null };
const mockOuvintes = new Set<() => void>();

function mockDefinirEstado(novo: Partial<typeof mockEstado>) {
  mockEstado = { ...mockEstado, ...novo };
  mockOuvintes.forEach((ouvinte) => ouvinte());
}

function mockSubscribe(ouvinte: () => void) {
  mockOuvintes.add(ouvinte);
  return () => mockOuvintes.delete(ouvinte);
}

function mockUseAuthFalso() {
  // É um hook de verdade (chama useSyncExternalStore), mas o nome precisa
  // começar com "mock" (não "use") para o Jest permitir referenciá-lo de
  // dentro do factory de `jest.mock` abaixo (hoisted para o topo do arquivo).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const estado = useSyncExternalStore(mockSubscribe, () => mockEstado);

  return {
    status: estado.status,
    usuario: estado.usuario,
    autenticado: estado.status === "autenticado",
    carregando: estado.status === "carregando",
    motivoFimSessao: null,
    entrar: async (credenciais: Credenciais): Promise<LoginResposta> => {
      const usuario: UsuarioAutenticado = {
        id: "1",
        nome: "Ana Candidata",
        email: credenciais.email,
        tipoUsuario: "candidato",
      };
      mockDefinirEstado({ usuario, status: "autenticado" });
      return { sucesso: true, token: "tok", refreshToken: "ref", usuario };
    },
    sair: async () => {
      mockDefinirEstado({ usuario: null, status: "naoAutenticado" });
    },
    limparMotivoFimSessao: () => {},
  };
}

jest.mock("../../autenticacao", () => ({
  useAutenticacao: () => mockUseAuthFalso(),
  AutenticacaoService: { reenviarConfirmacao: jest.fn(), esqueciSenha: jest.fn(), redefinirSenha: jest.fn() },
}));

// O `SegurancaProvider` chama estas três funções ao montar. O padrão é um aparelho sem biometria;
// só o `describe` de bloqueio biométrico, no fim do arquivo, muda isso.
const mockHasHardwareAsync = jest.fn();
const mockIsEnrolledAsync = jest.fn();
const mockAuthenticateAsync = jest.fn();

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: (...a: unknown[]) => mockHasHardwareAsync(...a),
  isEnrolledAsync: (...a: unknown[]) => mockIsEnrolledAsync(...a),
  authenticateAsync: (...a: unknown[]) => mockAuthenticateAsync(...a),
}));

// Com o status `autenticado`, o `FeedScreen` monta e busca o feed; sem este mock, os testes
// chamariam a API.
jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    listar: jest
      .fn()
      .mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, postagens: [] }),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../acessibilidade";
import { SegurancaProvider } from "../../seguranca";
import { TemaProvider } from "../../tema";
import { RaizNavigator } from "../RaizNavigator";

// O `AcessibilidadeProvider` é obrigatório porque o `TemaProvider` lê as preferências dele. O
// `SegurancaProvider` também, porque o `RaizNavigator` usa `useSeguranca()`; sem biometria mockada,
// `precisaDesbloquear` nunca interfere.
async function renderRoot(estadoInicial: { status: StatusAutenticacao; usuario: UsuarioAutenticado | null }) {
  mockEstado = estadoInicial;
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <SegurancaProvider>
          <RaizNavigator />
        </SegurancaProvider>
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("RaizNavigator", () => {
  beforeEach(async () => {
    mockHasHardwareAsync.mockResolvedValue(false);
    mockIsEnrolledAsync.mockResolvedValue(false);
    await AsyncStorage.clear();
  });
  afterEach(cleanup);

  it("status 'carregando' mostra a Splash", async () => {
    const { getByLabelText } = await renderRoot({ status: "carregando", usuario: null });
    expect(getByLabelText("Carregando sua sessão")).toBeTruthy();
  });

  it("status 'naoAutenticado' mostra a tela de login (Auth Stack)", async () => {
    const { getByLabelText, getByRole } = await renderRoot({ status: "naoAutenticado", usuario: null });
    expect(getByLabelText("E-mail")).toBeTruthy();
    expect(getByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("status 'naoSuportado' (conta administrador) mostra a tela de conta não suportada, nunca o App", async () => {
    const { getByText, queryByLabelText } = await renderRoot({
      status: "naoSuportado",
      usuario: { id: "9", nome: "Admin", email: "admin@exemplo.com", tipoUsuario: "administrador" },
    });
    expect(getByText("Este app não é para contas administrativas")).toBeTruthy();
    expect(queryByLabelText("Página inicial")).toBeNull();
  });

  it("status 'autenticado' mostra o App Stack (Bottom Tabs) — nunca a tela de login", async () => {
    const { getByText, queryByLabelText } = await renderRoot({
      status: "autenticado",
      usuario: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });
    expect(getByText("Olá, Ana!")).toBeTruthy();
    expect(queryByLabelText("E-mail")).toBeNull();
  });

  it("não autenticado nunca renderiza nenhuma tela protegida do App", async () => {
    const { queryByText } = await renderRoot({ status: "naoAutenticado", usuario: null });
    expect(queryByText("Vagas")).toBeNull();
    expect(queryByText("Mensagens")).toBeNull();
  });

  it("login bem-sucedido leva ao App (Home), sem deixar Login na pilha", async () => {
    const { getByLabelText, getByRole, findByText, queryByLabelText } = await renderRoot({
      status: "naoAutenticado",
      usuario: null,
    });

    await act(async () => {
      fireEvent.changeText(getByLabelText("E-mail"), "ana@exemplo.com");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Senha"), "123456");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Entrar" }));
    });

    expect(await findByText("Olá, Ana Candidata!")).toBeTruthy();
    // A tela de Login não fica na pilha por baixo: o ramo "Auth" inteiro
    // foi substituído pelo ramo "App" (ver comentário do RaizNavigator).
    expect(queryByLabelText("E-mail")).toBeNull();
  });

  it("logout a partir do Perfil volta para a tela de login, sem deixar nenhuma tela do App", async () => {
    const { getByLabelText, findByLabelText, queryByLabelText, queryByText } = await renderRoot({
      status: "autenticado",
      usuario: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });

    // Vai para a aba Perfil e toca em "Sair".
    await act(async () => {
      fireEvent.press(getByLabelText("Perfil"));
    });
    const botaoSair = await findByLabelText("Sair da conta");
    await act(async () => {
      fireEvent.press(botaoSair);
    });

    await waitFor(() => expect(getByLabelText("E-mail")).toBeTruthy());
    expect(queryByLabelText("Página inicial")).toBeNull();
    expect(queryByText("Olá, Ana!")).toBeNull();
  });

  describe("bloqueio biométrico", () => {
    const anaAutenticada = { status: "autenticado" as const, usuario: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" as const } };

    it("sem hardware/matrícula no aparelho, mesmo com a preferência ligada, mostra o App direto (nunca trava ninguém)", async () => {
      await AsyncStorage.setItem("acesso.segurancaPreferences", JSON.stringify({ bloqueioBiometricoAtivo: true }));
      mockHasHardwareAsync.mockResolvedValue(false);
      mockIsEnrolledAsync.mockResolvedValue(false);

      const { getByText } = await renderRoot(anaAutenticada);

      expect(getByText("Olá, Ana!")).toBeTruthy();
    });

    it("com hardware disponível mas a preferência DESLIGADA, mostra o App direto", async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);

      const { getByText } = await renderRoot(anaAutenticada);

      expect(getByText("Olá, Ana!")).toBeTruthy();
    });

    it("com hardware disponível E a preferência ligada, mostra a tela de bloqueio em vez do App", async () => {
      await AsyncStorage.setItem("acesso.segurancaPreferences", JSON.stringify({ bloqueioBiometricoAtivo: true }));
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);
      mockAuthenticateAsync.mockResolvedValue({ success: false, error: "user_cancel" });

      const { getByText, queryByText } = await renderRoot(anaAutenticada);

      expect(await waitFor(() => getByText("ACESSO bloqueado"))).toBeTruthy();
      expect(queryByText("Olá, Ana!")).toBeNull();
    });

    it("desbloquear com sucesso troca a tela de bloqueio pelo App", async () => {
      await AsyncStorage.setItem("acesso.segurancaPreferences", JSON.stringify({ bloqueioBiometricoAtivo: true }));
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      const { findByText } = await renderRoot(anaAutenticada);

      expect(await findByText("Olá, Ana!")).toBeTruthy();
    });
  });
});
