/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../AuthService", () => ({
  AuthService: {
    login: jest.fn(),
    registerCandidato: jest.fn(),
    registerEmpresa: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock("../../storage/secureStorage", () => ({
  getTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

jest.mock("../../services/api/client", () => ({
  setSession: jest.fn(),
  clearSession: jest.fn(),
  registerSessionEndedListener: jest.fn(),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import * as client from "../../services/api/client";
import * as secureStorage from "../../storage/secureStorage";
import { AuthProvider } from "../AuthProvider";
import { AuthService } from "../AuthService";
import type { Credenciais } from "../types";
import { useAuth } from "../useAuth";

function Sonda() {
  const { status, user } = useAuth();
  return <Text testID="status">{`${status}:${user?.email ?? ""}`}</Text>;
}

function SondaComAcoes({ credenciais }: { credenciais: Credenciais }) {
  const { status, user, login, registerCandidato, logout, refreshUser } = useAuth();
  return (
    <>
      <Text testID="status">{`${status}:${user?.email ?? ""}`}</Text>
      <Pressable testID="entrar" onPress={() => void login(credenciais)}>
        <Text>Entrar</Text>
      </Pressable>
      <Pressable
        testID="cadastrar"
        onPress={() => void registerCandidato({ nome: "Ana", email: credenciais.email, senha: credenciais.senha })}
      >
        <Text>Cadastrar</Text>
      </Pressable>
      <Pressable testID="sair" onPress={() => void logout()}>
        <Text>Sair</Text>
      </Pressable>
      <Pressable testID="atualizar" onPress={() => void refreshUser()}>
        <Text>Atualizar</Text>
      </Pressable>
    </>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("começa em 'loading' e vai para 'unauthenticated' quando não há sessão salva (sem chamar /me)", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);

    const { getByTestId } = await render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    expect(AuthService.me).not.toHaveBeenCalled();
  });

  it("com tokens salvos, restaura chamando /me e vai para 'authenticated'", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue({ accessToken: "a", refreshToken: "b" });
    (AuthService.me as jest.Mock).mockResolvedValue({ id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" });

    const { getByTestId } = await render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("authenticated:ana@exemplo.com"));
    expect(client.setSession).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "b" });
  });

  it("se /me falhar na restauração, limpa a sessão local e fica 'unauthenticated'", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue({ accessToken: "a", refreshToken: "b" });
    (AuthService.me as jest.Mock).mockRejectedValue(new Error("401"));

    const { getByTestId } = await render(
      <AuthProvider>
        <Sonda />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    expect(secureStorage.clearTokens).toHaveBeenCalled();
    expect(client.clearSession).toHaveBeenCalled();
  });

  it("login com sucesso muda o status para 'authenticated' e expõe o usuário", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (AuthService.login as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    // `login`/`logout` do contexto são funções assíncronas chamadas de
    // dentro do `onPress` — `await act(async () => { fireEvent.press(...) })`
    // garante que a atualização de estado resultante (depois do `await`
    // interno) seja de fato aplicada antes da próxima asserção, o que um
    // `fireEvent.press` cru não garante neste ambiente (React 19 + RNTL 14).
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("authenticated:ana@exemplo.com");
  });

  it("registerCandidato com pendenteVerificacaoEmail NÃO autentica — status continua 'unauthenticated'", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (AuthService.registerCandidato as jest.Mock).mockResolvedValue({
      sucesso: true,
      pendenteVerificacaoEmail: true,
      email: "nova@exemplo.com",
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <SondaComAcoes credenciais={{ email: "nova@exemplo.com", senha: "SenhaForte#1" }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    await act(async () => {
      fireEvent.press(getByTestId("cadastrar"));
    });
    expect(getByTestId("status").props.children).toBe("unauthenticated:");
  });

  it("registerCandidato com sessão direta (provedor de e-mail indisponível) autentica igual ao login", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (AuthService.registerCandidato as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "2", email: "nova@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <SondaComAcoes credenciais={{ email: "nova@exemplo.com", senha: "SenhaForte#1" }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    await act(async () => {
      fireEvent.press(getByTestId("cadastrar"));
    });
    expect(getByTestId("status").props.children).toBe("authenticated:nova@exemplo.com");
  });

  it("uma conta administrador autentica no backend, mas o status vira 'unsupported' (nunca 'authenticated')", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (AuthService.login as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "9", email: "admin@exemplo.com", tipoUsuario: "administrador" },
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <SondaComAcoes credenciais={{ email: "admin@exemplo.com", senha: "123456" }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("unsupported:admin@exemplo.com");
  });

  it("logout volta para 'unauthenticated' e limpa o usuário do contexto", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (AuthService.login as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });
    (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

    const { getByTestId } = await render(
      <AuthProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("authenticated:ana@exemplo.com");

    await act(async () => {
      fireEvent.press(getByTestId("sair"));
    });
    expect(getByTestId("status").props.children).toBe("unauthenticated:");
  });

  // Fase 15: telas que mudam nome/e-mail do próprio usuário (MyProfileScreen, SettingsScreen) usam isto para o resto do app (Home, menu do Perfil) parar de mostrar dado desatualizado.
  it("refreshUser busca /auth/me de novo e atualiza o usuário no contexto global", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (AuthService.login as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("authenticated:ana@exemplo.com");

    (AuthService.me as jest.Mock).mockResolvedValue({ id: "1", email: "novo@exemplo.com", tipoUsuario: "candidato" });
    await act(async () => {
      fireEvent.press(getByTestId("atualizar"));
    });

    expect(getByTestId("status").props.children).toBe("authenticated:novo@exemplo.com");
  });

  it("refreshUser: se a chamada falhar, mantém o usuário atual em memória (falha silenciosa)", async () => {
    (secureStorage.getTokens as jest.Mock).mockResolvedValue(null);
    (AuthService.login as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AuthProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByTestId("status").props.children).toBe("unauthenticated:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });

    (AuthService.me as jest.Mock).mockRejectedValue(new Error("falhou"));
    await act(async () => {
      fireEvent.press(getByTestId("atualizar"));
    });

    expect(getByTestId("status").props.children).toBe("authenticated:ana@exemplo.com");
  });
});
