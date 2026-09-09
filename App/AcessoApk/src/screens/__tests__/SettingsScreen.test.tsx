/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockUseAuth = jest.fn();
const mockListarSessoes = jest.fn();
const mockAlterarSenha = jest.fn();
const mockPausarConta = jest.fn();
const mockExcluirConta = jest.fn();
const mockSolicitarTrocaEmail = jest.fn();
const mockConfirmarTrocaEmail = jest.fn();
const mockRevogarSessao = jest.fn();
const mockRevogarOutrasSessoes = jest.fn();
const mockLogout = jest.fn();
const mockRefreshUser = jest.fn();

const mockObterPreferenciasNotificacao = jest.fn();
const mockAtualizarPreferenciasNotificacao = jest.fn();
const mockAtualizarPrivacidade = jest.fn();
const mockAtualizarPreferenciaMensagens = jest.fn();

jest.mock("../../auth", () => ({
  ...jest.requireActual("../../auth"),
  useAuth: () => mockUseAuth(),
  AuthService: {
    listarSessoes: (...a: unknown[]) => mockListarSessoes(...a),
    alterarSenha: (...a: unknown[]) => mockAlterarSenha(...a),
    pausarConta: (...a: unknown[]) => mockPausarConta(...a),
    excluirConta: (...a: unknown[]) => mockExcluirConta(...a),
    solicitarTrocaEmail: (...a: unknown[]) => mockSolicitarTrocaEmail(...a),
    confirmarTrocaEmail: (...a: unknown[]) => mockConfirmarTrocaEmail(...a),
    revogarSessao: (...a: unknown[]) => mockRevogarSessao(...a),
    revogarOutrasSessoes: (...a: unknown[]) => mockRevogarOutrasSessoes(...a),
  },
}));

jest.mock("../../configuracoes", () => ({
  ...jest.requireActual("../../configuracoes"),
  ConfiguracoesService: {
    obterPreferenciasNotificacao: (...a: unknown[]) => mockObterPreferenciasNotificacao(...a),
    atualizarPreferenciasNotificacao: (...a: unknown[]) => mockAtualizarPreferenciasNotificacao(...a),
    atualizarPrivacidade: (...a: unknown[]) => mockAtualizarPrivacidade(...a),
    atualizarPreferenciaMensagens: (...a: unknown[]) => mockAtualizarPreferenciaMensagens(...a),
  },
}));

// Fase 19: "Usuários bloqueados" usa `useNavigation()` — mantém
// `NavigationContainer`/resto do módulo reais (`requireActual`), só troca
// `useNavigation` por um mock controlável (o `NavigationContainer` real
// continua sendo o que envolve a tela no `renderTela` abaixo).
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { SettingsScreen } from "../SettingsScreen";

let alertSpy: jest.SpyInstance;

function confirmarViaAlert(textoBotao: string) {
  const ultimaChamada = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const botoes = ultimaChamada[2] as { text: string; onPress?: () => void }[];
  botoes.find((b) => b.text === textoBotao)?.onPress?.();
}

const preferenciasBase = {
  id: "p1",
  usuarioId: "u1",
  vagasCandidaturas: true,
  mensagens: true,
  publicacoesComentarios: false,
  redeSeguidores: true,
};

const sessaoAtual = { id: "s1", userAgent: "Android App", ip: "1.2.3.4", criadoEm: "2026-01-01T00:00:00.000Z", expiraEm: "x", atual: true };
const sessaoOutra = { id: "s2", userAgent: "iPhone", ip: "5.6.7.8", criadoEm: "2026-01-02T00:00:00.000Z", expiraEm: "x", atual: false };

function mockCargaPadrao(sessoes: unknown[] = [sessaoAtual]) {
  mockListarSessoes.mockResolvedValue(sessoes);
  mockObterPreferenciasNotificacao.mockResolvedValue(preferenciasBase);
}

// Fase 19: `SecaoPrivacidade` ganhou um botão "Usuários bloqueados" que
// navega (`useNavigation`) — precisa de um `NavigationContainer` de verdade
// por baixo, mesmo sem testar navegação nenhuma nos outros casos.
async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <NavigationContainer>
          <SettingsScreen />
        </NavigationContainer>
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert");
    mockUseAuth.mockReturnValue({
      user: { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato", perfilPublico: true, preferenciaMensagens: "todos" },
      logout: mockLogout,
      refreshUser: mockRefreshUser,
    });
  });

  it("mostra loading e depois todas as seções", async () => {
    mockCargaPadrao();
    const { findByText } = await renderTela();

    expect(await findByText("Privacidade")).toBeTruthy();
    expect(await findByText("Notificações")).toBeTruthy();
    expect(await findByText("Alterar senha")).toBeTruthy();
    expect(await findByText("E-mail")).toBeTruthy();
    expect(await findByText("Sessões ativas")).toBeTruthy();
    expect(await findByText("Zona de perigo")).toBeTruthy();
  });

  it("falha ao carregar mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListarSessoes.mockRejectedValueOnce(erro);
    mockObterPreferenciasNotificacao.mockResolvedValue(preferenciasBase);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar suas configurações")).toBeTruthy();

    mockCargaPadrao();
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Privacidade")).toBeTruthy();
  });

  describe("privacidade", () => {
    it("alternar 'Perfil público' chama atualizarPrivacidade", async () => {
      mockCargaPadrao();
      mockAtualizarPrivacidade.mockResolvedValue(false);
      const { getByLabelText, findByText } = await renderTela();
      await findByText("Privacidade");

      await act(async () => {
        fireEvent(getByLabelText("Perfil público"), "valueChange", false);
      });

      expect(mockAtualizarPrivacidade).toHaveBeenCalledWith(false);
    });

    it("toque em 'Usuários bloqueados' navega para BlockedUsers", async () => {
      mockCargaPadrao();
      const { getByRole, findByText } = await renderTela();
      await findByText("Privacidade");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Usuários bloqueados" }));
      });

      expect(mockNavigate).toHaveBeenCalledWith("BlockedUsers");
    });

    it("mudar preferência de mensagens chama atualizarPreferenciaMensagens", async () => {
      mockCargaPadrao();
      mockAtualizarPreferenciaMensagens.mockResolvedValue("seguidores");
      const { getByLabelText, findByText } = await renderTela();
      await findByText("Privacidade");

      await act(async () => {
        fireEvent.press(getByLabelText("Só meus seguidores"));
      });

      expect(mockAtualizarPreferenciaMensagens).toHaveBeenCalledWith("seguidores");
    });
  });

  describe("notificações", () => {
    it("alternar uma preferência chama atualizarPreferenciasNotificacao só com o campo mudado", async () => {
      mockCargaPadrao();
      mockAtualizarPreferenciasNotificacao.mockResolvedValue({ ...preferenciasBase, mensagens: false });
      const { getByLabelText, findByText } = await renderTela();
      await findByText("Notificações");

      await act(async () => {
        fireEvent(getByLabelText("Mensagens"), "valueChange", false);
      });

      expect(mockAtualizarPreferenciasNotificacao).toHaveBeenCalledWith({ mensagens: false });
    });
  });

  describe("alterar senha", () => {
    it("senhas diferentes não salva — mostra erro", async () => {
      mockCargaPadrao();
      const { getByLabelText, getAllByLabelText, getByRole, findByText } = await renderTela();
      await findByText("Alterar senha");

      // "Senha atual" existe também na seção E-mail (índice 1) — a de
      // "Alterar senha" é sempre a primeira no documento.
      await act(async () => {
        fireEvent.changeText(getAllByLabelText("Senha atual")[0], "SenhaAtual#1");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Nova senha"), "SenhaNova#1");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Confirmar nova senha"), "Diferente#1");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar nova senha" }));
      });

      expect(await findByText("As senhas não coincidem.")).toBeTruthy();
      expect(mockAlterarSenha).not.toHaveBeenCalled();
    });

    it("sucesso chama alterarSenha, limpa os campos e mostra confirmação (polite)", async () => {
      mockCargaPadrao();
      mockAlterarSenha.mockResolvedValue(undefined);
      const { getAllByLabelText, getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("Alterar senha");

      await act(async () => {
        fireEvent.changeText(getAllByLabelText("Senha atual")[0], "SenhaAtual#1");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Nova senha"), "SenhaNova#1");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Confirmar nova senha"), "SenhaNova#1");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar nova senha" }));
      });

      expect(mockAlterarSenha).toHaveBeenCalledWith("SenhaAtual#1", "SenhaNova#1");
      const confirmacao = await findByText("Senha alterada com sucesso. Suas outras sessões foram encerradas.");
      expect(confirmacao.props.accessibilityLiveRegion).toBe("polite");
      expect(getAllByLabelText("Senha atual")[0].props.value).toBe("");
    });
  });

  describe("trocar e-mail", () => {
    it("fluxo completo: solicitar → confirmar → refreshUser", async () => {
      mockCargaPadrao();
      mockSolicitarTrocaEmail.mockResolvedValue(undefined);
      mockConfirmarTrocaEmail.mockResolvedValue({ id: "u1", nome: "Ana", email: "novo@exemplo.com", tipoUsuario: "candidato" });
      const { getAllByLabelText, getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("E-mail atual: ana@exemplo.com");

      // "Senha atual" existe também na seção "Alterar senha" (índice 0) —
      // a da seção E-mail é sempre a segunda no documento.
      await act(async () => {
        fireEvent.changeText(getAllByLabelText("Senha atual")[1], "SenhaAtual#1");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Novo e-mail"), "novo@exemplo.com");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Enviar código de confirmação" }));
      });

      expect(mockSolicitarTrocaEmail).toHaveBeenCalledWith("SenhaAtual#1", "novo@exemplo.com");
      expect(await findByText("Enviamos um código de 6 dígitos para novo@exemplo.com.")).toBeTruthy();

      await act(async () => {
        fireEvent.changeText(getByLabelText("Código de confirmação"), "123456");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Confirmar novo e-mail" }));
      });

      expect(mockConfirmarTrocaEmail).toHaveBeenCalledWith("123456");
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  describe("sessões ativas", () => {
    it("mostra a sessão atual marcada e sem botão de encerrar para ela", async () => {
      mockCargaPadrao([sessaoAtual]);
      const { findByText, queryByRole } = await renderTela();

      expect(await findByText("Esta sessão")).toBeTruthy();
      expect(queryByRole("button", { name: "Encerrar sessão" })).toBeNull();
    });

    it("encerrar uma sessão específica chama revogarSessao e remove da lista", async () => {
      mockCargaPadrao([sessaoAtual, sessaoOutra]);
      mockRevogarSessao.mockResolvedValue(undefined);
      const { getByRole, findByText, queryByText } = await renderTela();
      await findByText("iPhone");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Encerrar sessão" }));
      });

      expect(mockRevogarSessao).toHaveBeenCalledWith("s2");
      await waitFor(() => expect(queryByText("iPhone")).toBeNull());
    });

    it("'Encerrar todas as outras sessões' chama revogarOutrasSessoes e mantém só a atual", async () => {
      mockCargaPadrao([sessaoAtual, sessaoOutra]);
      mockRevogarOutrasSessoes.mockResolvedValue(undefined);
      const { getByRole, findByText, queryByText } = await renderTela();
      await findByText("iPhone");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Encerrar todas as outras sessões" }));
      });

      expect(mockRevogarOutrasSessoes).toHaveBeenCalled();
      await waitFor(() => expect(queryByText("iPhone")).toBeNull());
      expect(await findByText("Android App")).toBeTruthy();
    });
  });

  describe("zona de perigo", () => {
    it("pausar conta pede senha, confirma via Alert e chama pausarConta + logout", async () => {
      mockCargaPadrao();
      mockPausarConta.mockResolvedValue(undefined);
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Zona de perigo");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Pausar minha conta" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Confirme sua senha"), "SenhaAtual#1");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Confirmar pausa" }));
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "Pausar conta",
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({ text: "Cancelar" }), expect.objectContaining({ text: "Pausar" })]),
      );
      expect(mockPausarConta).not.toHaveBeenCalled(); // só depois de confirmar no Alert

      await act(async () => {
        confirmarViaAlert("Pausar");
      });

      expect(mockPausarConta).toHaveBeenCalledWith("SenhaAtual#1");
      expect(mockLogout).toHaveBeenCalled();
    });

    it("excluir conta pede senha, confirma via Alert (destructive) e chama excluirConta + logout", async () => {
      mockCargaPadrao();
      mockExcluirConta.mockResolvedValue(undefined);
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Zona de perigo");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir minha conta" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Confirme sua senha"), "SenhaAtual#1");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Confirmar exclusão" }));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(mockExcluirConta).toHaveBeenCalledWith("SenhaAtual#1");
      expect(mockLogout).toHaveBeenCalled();
    });

    it("senha incorreta ao excluir mostra erro e NÃO chama logout", async () => {
      mockCargaPadrao();
      const erro = Object.assign(new Error("401"), { isAxiosError: true, response: { data: { mensagem: "Senha atual incorreta." } } });
      mockExcluirConta.mockRejectedValue(erro);
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Zona de perigo");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir minha conta" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Confirme sua senha"), "errada");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Confirmar exclusão" }));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(await findByText("Senha atual incorreta.")).toBeTruthy();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it("cancelar o formulário de excluir some com os campos, sem chamar excluirConta", async () => {
      mockCargaPadrao();
      const { getByRole, getByLabelText, queryByLabelText, findByText } = await renderTela();
      await findByText("Zona de perigo");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir minha conta" }));
      });
      expect(getByLabelText("Confirme sua senha")).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Cancelar" }));
      });

      expect(queryByLabelText("Confirme sua senha")).toBeNull();
      expect(mockExcluirConta).not.toHaveBeenCalled();
    });
  });
});
