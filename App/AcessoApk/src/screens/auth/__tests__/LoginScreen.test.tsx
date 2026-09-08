/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockLogin = jest.fn();
const mockReenviarConfirmacao = jest.fn();
const mockClearSessionEndedReason = jest.fn();

jest.mock("../../../auth", () => ({
  useAuth: () => ({
    login: mockLogin,
    sessionEndedReason: null,
    clearSessionEndedReason: mockClearSessionEndedReason,
  }),
  AuthService: {
    reenviarConfirmacao: (...args: unknown[]) => mockReenviarConfirmacao(...args),
  },
}));

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { LoginScreen } from "../LoginScreen";

// Este ambiente (React 19.2 + react-test-renderer 19.2 + RNTL 14, todos na
// versão mais recente que o Expo SDK 57 traz) não comita de forma confiável
// uma atualização de estado disparada de DENTRO de uma função assíncrona
// chamada por `onPress` quando só se usa `fireEvent.press` cru — confirmado
// isolando o comportamento num componente mínimo antes de escrever estes
// testes. `await act(async () => { fireEvent...(...) })` resolve isso de
// forma confiável (aguarda a função assíncrona liberar o controle e só
// então aplica as atualizações pendentes), então todo toque/digitação que
// este arquivo precisa observar o resultado passa por aqui.
async function pressionar(elemento: ReturnType<typeof screen.getByRole>) {
  await act(async () => {
    fireEvent.press(elemento);
  });
}

async function digitar(elemento: ReturnType<typeof screen.getByLabelText>, texto: string) {
  await act(async () => {
    fireEvent.changeText(elemento, texto);
  });
}

// `AccessibilityProvider` (Fase 5) é obrigatório: `ThemeProvider` lê
// preferências dele e renderiza `null` até a leitura inicial do
// AsyncStorage mockado terminar.
async function renderComTema(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it("renderiza os campos de e-mail e senha e o botão Entrar", async () => {
    const { getByLabelText, getByRole } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);
    expect(getByLabelText("E-mail")).toBeTruthy();
    expect(getByLabelText("Senha")).toBeTruthy();
    expect(getByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("o campo de senha começa oculto e alterna ao tocar em 'Mostrar senha'", async () => {
    const { getByLabelText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);
    expect(getByLabelText("Senha").props.secureTextEntry).toBe(true);

    await pressionar(getByLabelText("Mostrar senha"));

    expect(getByLabelText("Senha").props.secureTextEntry).toBe(false);
  });

  it("com os campos vazios, não chama login — mostra um erro em vez disso", async () => {
    const { getByRole, findByText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await pressionar(getByRole("button", { name: "Entrar" }));

    expect(await findByText("Informe e-mail e senha.")).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("preenchendo e-mail e senha e enviando, chama login com o payload correto", async () => {
    mockLogin.mockResolvedValue({ sucesso: true, token: "t", refreshToken: "r", usuario: {} });
    const { getByLabelText, getByRole } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));

    expect(mockLogin).toHaveBeenCalledWith({ email: "ana@exemplo.com", senha: "123456" });
  });

  it("mostra o botão em estado ocupado (accessibilityState.busy) enquanto o login está em andamento", async () => {
    let resolverLogin: (valor: unknown) => void = () => {};
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolverLogin = resolve;
      }),
    );
    const { getByLabelText, getByRole } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));

    expect(getByRole("button", { name: "Entrar" }).props.accessibilityState.busy).toBe(true);

    await act(async () => {
      resolverLogin({ sucesso: true, token: "t", refreshToken: "r", usuario: {} });
    });

    expect(getByRole("button", { name: "Entrar" }).props.accessibilityState.busy).toBe(false);
  });

  it("não dispara uma segunda chamada de login se o botão for tocado de novo enquanto a primeira ainda está em andamento", async () => {
    let resolverLogin: (valor: unknown) => void = () => {};
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolverLogin = resolve;
      }),
    );
    const { getByLabelText, getByRole } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");

    const botao = getByRole("button", { name: "Entrar" });
    await pressionar(botao); // primeiro toque: inicia o login (fica pendente)
    await pressionar(botao); // segundo toque: precisa ser ignorado
    await pressionar(botao); // terceiro toque: idem

    expect(mockLogin).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolverLogin({ sucesso: true, token: "t", refreshToken: "r", usuario: {} });
    });
  });

  it("mostra uma mensagem de erro compreensível (nunca o erro técnico) quando o login falha", async () => {
    mockLogin.mockRejectedValue(new Error("Request failed with status code 401"));
    const { getByLabelText, getByRole, findByText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "senha-errada");
    await pressionar(getByRole("button", { name: "Entrar" }));

    const mensagem = await findByText("Não foi possível entrar. Verifique seus dados.");
    expect(mensagem.props.accessibilityRole).toBe("alert");
  });

  it("chama onEsqueciSenha ao tocar em 'Esqueci minha senha'", async () => {
    const onEsqueciSenha = jest.fn();
    const { getByLabelText } = await renderComTema(<LoginScreen onEsqueciSenha={onEsqueciSenha} />);

    await pressionar(getByLabelText("Esqueci minha senha"));

    expect(onEsqueciSenha).toHaveBeenCalledTimes(1);
  });

  // Fase 7 (auditoria de acessibilidade): as duas etapas abaixo não tinham
  // NENHUM teste antes — a correção (accessibilityLiveRegion nos textos de
  // erro/sucesso) precisava de um teste que sequer chegasse a renderizá-las.
  it("conta pausada: uma falha ao reativar mostra o erro com accessibilityLiveRegion=assertive", async () => {
    mockLogin
      .mockResolvedValueOnce({ sucesso: true, contaPausada: true })
      .mockRejectedValueOnce(new Error("falha ao reativar"));
    const { getByLabelText, getByRole, findByText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    expect(await findByText("Sua conta está pausada")).toBeTruthy();

    await pressionar(getByRole("button", { name: "Reativar minha conta" }));

    const erro = await findByText("Não foi possível entrar. Verifique seus dados.");
    expect(erro.props.accessibilityLiveRegion).toBe("assertive");
  });

  it("e-mail não verificado: reenviar com sucesso mostra a confirmação com accessibilityLiveRegion=polite", async () => {
    mockLogin.mockResolvedValue({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" });
    mockReenviarConfirmacao.mockResolvedValue(undefined);
    const { getByLabelText, getByRole, findByText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    expect(await findByText("Confirme seu e-mail")).toBeTruthy();

    await pressionar(getByRole("button", { name: "Reenviar e-mail" }));

    const confirmacao = await findByText("E-mail reenviado.");
    expect(confirmacao.props.accessibilityLiveRegion).toBe("polite");
  });
});

/**
 * Fase 8, item 22 — protege a política de anúncio de transição de etapa
 * (ver o comentário de `ANUNCIOS_TRANSICAO` em `LoginScreen.tsx`): as duas
 * transições PARA FORA de "credenciais" produzem exatamente um anúncio cada
 * uma, com o texto certo, e o caminho de volta não anuncia nada.
 */
describe("LoginScreen — anúncios de transição de etapa (Fase 8)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("credenciais → conta pausada: anuncia exatamente 'Conta pausada.', uma única vez", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    mockLogin.mockResolvedValue({ sucesso: true, contaPausada: true });
    const { getByLabelText, getByRole, findByText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    await findByText("Sua conta está pausada");

    expect(anunciar).toHaveBeenCalledTimes(1);
    expect(anunciar).toHaveBeenCalledWith("Conta pausada.");
  });

  it("credenciais → e-mail não verificado: anuncia exatamente 'E-mail não verificado.', uma única vez", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    mockLogin.mockResolvedValue({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" });
    const { getByLabelText, getByRole, findByText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    await findByText("Confirme seu e-mail");

    expect(anunciar).toHaveBeenCalledTimes(1);
    expect(anunciar).toHaveBeenCalledWith("E-mail não verificado.");
  });

  it("voltar para credenciais (botão 'Voltar'/'Cancelar') não dispara nenhum anúncio — o usuário acabou de tocar num botão com esse nome", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    mockLogin.mockResolvedValue({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" });
    const { getByLabelText, getByRole, findByText } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    await findByText("Confirme seu e-mail");
    anunciar.mockClear(); // limpa o anúncio da própria transição de ENTRADA, testado acima

    await pressionar(getByRole("button", { name: "Voltar" }));
    await findByText("Entre para continuar");

    expect(anunciar).not.toHaveBeenCalled();
  });

  it("login bem-sucedido (sem etapa intermediária) não dispara nenhum anúncio de transição", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    mockLogin.mockResolvedValue({ sucesso: true, token: "t", refreshToken: "r", usuario: {} });
    const { getByLabelText, getByRole } = await renderComTema(<LoginScreen onEsqueciSenha={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));

    expect(anunciar).not.toHaveBeenCalled();
  });
});
