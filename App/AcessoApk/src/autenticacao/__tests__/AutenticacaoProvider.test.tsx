/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../AutenticacaoService", () => ({
  AutenticacaoService: {
    entrar: jest.fn(),
    cadastrarCandidato: jest.fn(),
    cadastrarEmpresa: jest.fn(),
    obterUsuarioAtual: jest.fn(),
    sair: jest.fn(),
  },
}));

jest.mock("../../armazenamento/armazenamentoSeguro", () => ({
  obterTokens: jest.fn(),
  limparTokens: jest.fn(),
}));

jest.mock("../../services/api/cliente", () => ({
  definirSessao: jest.fn(),
  limparSessao: jest.fn(),
  registrarOuvinteFimSessao: jest.fn(),
}));

// O Provider registra e remove o push token ao entrar e sair; o push tem suíte própria, então aqui
// as chamadas não fazem nada.
jest.mock("../../notificacoes", () => ({
  registrarDispositivoParaPush: jest.fn(async () => undefined),
  removerDispositivoDoPush: jest.fn(async () => undefined),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import * as client from "../../services/api/cliente";
import * as armazenamentoSeguro from "../../armazenamento/armazenamentoSeguro";
import { AutenticacaoProvider } from "../AutenticacaoProvider";
import { AutenticacaoService } from "../AutenticacaoService";
import type { Credenciais } from "../types";
import { useAutenticacao } from "../useAutenticacao";

function Sonda() {
  const { status, usuario } = useAutenticacao();
  return <Text testID="status">{`${status}:${usuario?.email ?? ""}`}</Text>;
}

function SondaComAcoes({ credenciais }: { credenciais: Credenciais }) {
  const { status, usuario, entrar, cadastrarCandidato, sair, atualizarUsuario } = useAutenticacao();
  return (
    <>
      <Text testID="status">{`${status}:${usuario?.email ?? ""}`}</Text>
      <Pressable testID="entrar" onPress={() => void entrar(credenciais)}>
        <Text>Entrar</Text>
      </Pressable>
      <Pressable
        testID="cadastrar"
        onPress={() => void cadastrarCandidato({ nome: "Ana", email: credenciais.email, senha: credenciais.senha })}
      >
        <Text>Cadastrar</Text>
      </Pressable>
      <Pressable testID="sair" onPress={() => void sair()}>
        <Text>Sair</Text>
      </Pressable>
      <Pressable testID="atualizar" onPress={() => void atualizarUsuario()}>
        <Text>Atualizar</Text>
      </Pressable>
    </>
  );
}

describe("AutenticacaoProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("começa em 'carregando' e vai para 'naoAutenticado' quando não há sessão salva (sem chamar /me)", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <Sonda />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    expect(AutenticacaoService.obterUsuarioAtual).not.toHaveBeenCalled();
  });

  it("com tokens salvos, restaura chamando /me e vai para 'autenticado'", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue({ accessToken: "a", refreshToken: "b" });
    (AutenticacaoService.obterUsuarioAtual as jest.Mock).mockResolvedValue({ id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" });

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <Sonda />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("autenticado:ana@exemplo.com"));
    expect(client.definirSessao).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "b" });
  });

  it("se /me falhar na restauração, limpa a sessão local e fica 'naoAutenticado'", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue({ accessToken: "a", refreshToken: "b" });
    (AutenticacaoService.obterUsuarioAtual as jest.Mock).mockRejectedValue(new Error("401"));

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <Sonda />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    expect(armazenamentoSeguro.limparTokens).toHaveBeenCalled();
    expect(client.limparSessao).toHaveBeenCalled();
  });

  it("login com sucesso muda o status para 'autenticado' e expõe o usuário", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);
    (AutenticacaoService.entrar as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    // `entrar` e `sair` são assíncronos e chamados dentro do `onPress`. O
    // `await act(async () => ...)` garante que o estado resultante já foi aplicado antes da próxima
    // asserção, o que um `fireEvent.press` simples não garante com React 19 e RNTL 14.
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("autenticado:ana@exemplo.com");
  });

  it("cadastrarCandidato com pendenteVerificacaoEmail NÃO autentica — status continua 'naoAutenticado'", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);
    (AutenticacaoService.cadastrarCandidato as jest.Mock).mockResolvedValue({
      sucesso: true,
      pendenteVerificacaoEmail: true,
      email: "nova@exemplo.com",
    });

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <SondaComAcoes credenciais={{ email: "nova@exemplo.com", senha: "SenhaForte#1" }} />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    await act(async () => {
      fireEvent.press(getByTestId("cadastrar"));
    });
    expect(getByTestId("status").props.children).toBe("naoAutenticado:");
  });

  it("cadastrarCandidato com sessão direta (provedor de e-mail indisponível) autentica igual ao login", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);
    (AutenticacaoService.cadastrarCandidato as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "2", email: "nova@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <SondaComAcoes credenciais={{ email: "nova@exemplo.com", senha: "SenhaForte#1" }} />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    await act(async () => {
      fireEvent.press(getByTestId("cadastrar"));
    });
    expect(getByTestId("status").props.children).toBe("autenticado:nova@exemplo.com");
  });

  it("uma conta administrador autentica no backend, mas o status vira 'naoSuportado' (nunca 'autenticado')", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);
    (AutenticacaoService.entrar as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "9", email: "admin@exemplo.com", tipoUsuario: "administrador" },
    });

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <SondaComAcoes credenciais={{ email: "admin@exemplo.com", senha: "123456" }} />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("naoSuportado:admin@exemplo.com");
  });

  it("logout volta para 'naoAutenticado' e limpa o usuário do contexto", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);
    (AutenticacaoService.entrar as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });
    (AutenticacaoService.sair as jest.Mock).mockResolvedValue(undefined);

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AutenticacaoProvider>,
    );

    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("autenticado:ana@exemplo.com");

    await act(async () => {
      fireEvent.press(getByTestId("sair"));
    });
    expect(getByTestId("status").props.children).toBe("naoAutenticado:");
  });

  it("atualizarUsuario busca /auth/me de novo e atualiza o usuário no contexto global", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);
    (AutenticacaoService.entrar as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AutenticacaoProvider>,
    );
    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });
    expect(getByTestId("status").props.children).toBe("autenticado:ana@exemplo.com");

    (AutenticacaoService.obterUsuarioAtual as jest.Mock).mockResolvedValue({ id: "1", email: "novo@exemplo.com", tipoUsuario: "candidato" });
    await act(async () => {
      fireEvent.press(getByTestId("atualizar"));
    });

    expect(getByTestId("status").props.children).toBe("autenticado:novo@exemplo.com");
  });

  it("atualizarUsuario: se a chamada falhar, mantém o usuário atual em memória (falha silenciosa)", async () => {
    (armazenamentoSeguro.obterTokens as jest.Mock).mockResolvedValue(null);
    (AutenticacaoService.entrar as jest.Mock).mockResolvedValue({
      sucesso: true,
      token: "t",
      refreshToken: "r",
      usuario: { id: "1", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    });

    const { getByTestId } = await render(
      <AutenticacaoProvider>
        <SondaComAcoes credenciais={{ email: "ana@exemplo.com", senha: "123456" }} />
      </AutenticacaoProvider>,
    );
    await waitFor(() => expect(getByTestId("status").props.children).toBe("naoAutenticado:"));
    await act(async () => {
      fireEvent.press(getByTestId("entrar"));
    });

    (AutenticacaoService.obterUsuarioAtual as jest.Mock).mockRejectedValue(new Error("falhou"));
    await act(async () => {
      fireEvent.press(getByTestId("atualizar"));
    });

    expect(getByTestId("status").props.children).toBe("autenticado:ana@exemplo.com");
  });
});
