/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockLogin = jest.fn();
const mockReenviarConfirmacao = jest.fn();
const mockConfirmarCadastro = jest.fn();
const mockClearSessionEndedReason = jest.fn();
// A sessão anterior pode ter terminado sozinha; cada teste define o motivo antes de renderizar.
let mockMotivoFimSessao: "expirada" | "bloqueada" | "senha_alterada" | null = null;

jest.mock("../../../autenticacao", () => ({
  useAutenticacao: () => ({
    entrar: mockLogin,
    motivoFimSessao: mockMotivoFimSessao,
    limparMotivoFimSessao: mockClearSessionEndedReason,
  }),
  AutenticacaoService: {
    reenviarConfirmacao: (...args: unknown[]) => mockReenviarConfirmacao(...args),
    confirmarCadastro: (...args: unknown[]) => mockConfirmarCadastro(...args),
  },
}));

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { EntrarScreen } from "../EntrarScreen";

// Com React 19.2, react-test-renderer 19.2 e RNTL 14, um `fireEvent.press` simples não aplica de
// forma confiável o estado alterado dentro de uma função assíncrona chamada pelo `onPress`. O
// `await act(async () => ...)` espera a função liberar o controle e só então aplica as
// atualizações, por isso todo toque cujo resultado o teste observa passa por aqui.
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

// O `AcessibilidadeProvider` é obrigatório: o `TemaProvider` lê as preferências dele e renderiza
// `null` até o AsyncStorage mockado responder.
async function renderComTema(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("EntrarScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMotivoFimSessao = null;
  });

  afterEach(cleanup);

  // Cada motivo de fim de sessão tem uma explicação própria: "sessão expirou" seria enganoso para
  // quem acabou de trocar a senha ou teve a conta bloqueada. O motivo é consumido no primeiro
  // render, para a mensagem não voltar numa remontagem da tela.
  it.each([
    ["expirada", "Sua sessão expirou. Entre novamente."],
    ["bloqueada", "Sua conta foi bloqueada. Entre em contato com o suporte do ACESSO."],
    ["senha_alterada", "Sua senha foi alterada, e isso encerra a sessão em todos os aparelhos. Entre com a senha nova."],
  ] as const)("sessão encerrada por %s: mostra a mensagem e consome o motivo", async (motivo, mensagem) => {
    mockMotivoFimSessao = motivo;

    const { findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

    expect(await findByText(mensagem)).toBeTruthy();
    expect(mockClearSessionEndedReason).toHaveBeenCalledTimes(1);
  });

  it("renderiza os campos de e-mail e senha e o botão Entrar", async () => {
    const { getByLabelText, getByRole } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);
    expect(getByLabelText("E-mail")).toBeTruthy();
    expect(getByLabelText("Senha")).toBeTruthy();
    expect(getByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("o campo de senha começa oculto e alterna ao tocar em 'Mostrar senha'", async () => {
    const { getByLabelText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);
    expect(getByLabelText("Senha").props.secureTextEntry).toBe(true);

    await pressionar(getByLabelText("Mostrar senha"));

    expect(getByLabelText("Senha").props.secureTextEntry).toBe(false);
  });

  it("com os campos vazios, não chama login — mostra um erro em vez disso", async () => {
    const { getByRole, findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

    await pressionar(getByRole("button", { name: "Entrar" }));

    expect(await findByText("Informe e-mail e senha.")).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("preenchendo e-mail e senha e enviando, chama login com o payload correto", async () => {
    mockLogin.mockResolvedValue({ sucesso: true, token: "t", refreshToken: "r", usuario: {} });
    const { getByLabelText, getByRole } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

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
    const { getByLabelText, getByRole } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

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
    const { getByLabelText, getByRole } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

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
    const { getByLabelText, getByRole, findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "senha-errada");
    await pressionar(getByRole("button", { name: "Entrar" }));

    const mensagem = await findByText("Não foi possível entrar. Verifique seus dados.");
    expect(mensagem.props.accessibilityRole).toBe("alert");
  });

  it("chama onEsqueciSenha ao tocar em 'Esqueci minha senha'", async () => {
    const onEsqueciSenha = jest.fn();
    const { getByLabelText } = await renderComTema(<EntrarScreen onEsqueciSenha={onEsqueciSenha} onCriarConta={jest.fn()} />);

    await pressionar(getByLabelText("Esqueci minha senha"));

    expect(onEsqueciSenha).toHaveBeenCalledTimes(1);
  });

  it("conta pausada: uma falha ao reativar mostra o erro com accessibilityLiveRegion=assertive", async () => {
    mockLogin
      .mockResolvedValueOnce({ sucesso: true, contaPausada: true })
      .mockRejectedValueOnce(new Error("falha ao reativar"));
    const { getByLabelText, getByRole, findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

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
    const { getByLabelText, getByRole, findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    expect(await findByText("Confirme seu e-mail")).toBeTruthy();

    await pressionar(getByRole("button", { name: "Reenviar e-mail" }));

    const confirmacao = await findByText("E-mail reenviado.");
    expect(confirmacao.props.accessibilityLiveRegion).toBe("polite");
  });

  it("e-mail não verificado: confirmar com o código certo tenta entrar de novo automaticamente (mesmas credenciais)", async () => {
    mockLogin
      .mockResolvedValueOnce({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" })
      .mockResolvedValueOnce({ sucesso: true, token: "t", refreshToken: "r", usuario: {} });
    mockConfirmarCadastro.mockResolvedValue({ mensagem: "E-mail confirmado com sucesso." });
    const { getByLabelText, getByRole, findByText } = await renderComTema(
      <EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />,
    );

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    await findByText("Confirme seu e-mail");

    await digitar(getByLabelText("Código de confirmação"), "123456");
    await pressionar(getByRole("button", { name: "Confirmar e-mail" }));

    expect(mockConfirmarCadastro).toHaveBeenCalledWith("ana@exemplo.com", "123456");
    // Reentrou sozinho com o e-mail/senha já digitados: sem precisar de um terceiro toque em "Entrar".
    expect(mockLogin).toHaveBeenCalledTimes(2);
    expect(mockLogin).toHaveBeenLastCalledWith({ email: "ana@exemplo.com", senha: "123456" });
  });

  it("e-mail não verificado: código errado mostra a mensagem amigável, sem tentar login de novo", async () => {
    mockLogin.mockResolvedValue({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" });
    const erro400 = Object.assign(new Error("400"), {
      isAxiosError: true,
      response: { data: { mensagem: "Código inválido ou expirado." } },
    });
    mockConfirmarCadastro.mockRejectedValue(erro400);
    const { getByLabelText, getByRole, findByText } = await renderComTema(
      <EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />,
    );

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    await findByText("Confirme seu e-mail");

    await digitar(getByLabelText("Código de confirmação"), "000000");
    await pressionar(getByRole("button", { name: "Confirmar e-mail" }));

    const mensagem = await findByText("Código inválido ou expirado.");
    expect(mensagem.props.accessibilityLiveRegion).toBe("assertive");
    expect(mockLogin).toHaveBeenCalledTimes(1); // não tentou entrar de novo
  });

  it("chama onCriarConta ao tocar em 'Criar conta'", async () => {
    const onCriarConta = jest.fn();
    const { getByLabelText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={onCriarConta} />);

    await pressionar(getByLabelText("Criar conta"));

    expect(onCriarConta).toHaveBeenCalledTimes(1);
  });

  it("'Criar conta' some durante a etapa de e-mail não verificado (não deve tirar o usuário do fluxo de confirmação)", async () => {
    mockLogin.mockResolvedValue({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" });
    const { getByLabelText, getByRole, findByText, queryByLabelText } = await renderComTema(
      <EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />,
    );

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    await findByText("Confirme seu e-mail");

    expect(queryByLabelText("Criar conta")).toBeNull();
  });

  it("preenche o e-mail inicial vindo de um cadastro recém-confirmado (emailInicial)", async () => {
    const { getByLabelText } = await renderComTema(
      <EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} emailInicial="nova@exemplo.com" />,
    );

    expect(getByLabelText("E-mail").props.value).toBe("nova@exemplo.com");
  });
});

/**
 * Protege a regra de anúncio de troca de etapa (ver `ANUNCIOS_TRANSICAO` em `EntrarScreen.tsx`):
 * cada saída de "credenciais" gera exatamente um anúncio com o texto certo, e a volta não anuncia
 * nada.
 */
describe("EntrarScreen — anúncios de transição de etapa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("credenciais → conta pausada: anuncia exatamente 'Conta pausada.', uma única vez", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    mockLogin.mockResolvedValue({ sucesso: true, contaPausada: true });
    const { getByLabelText, getByRole, findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

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
    const { getByLabelText, getByRole, findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

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
    const { getByLabelText, getByRole, findByText } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));
    await findByText("Confirme seu e-mail");
    anunciar.mockClear(); // limpa o anúncio da própria transição de entrada, testado acima

    await pressionar(getByRole("button", { name: "Voltar" }));
    await findByText("Entre para continuar");

    expect(anunciar).not.toHaveBeenCalled();
  });

  it("login bem-sucedido (sem etapa intermediária) não dispara nenhum anúncio de transição", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    mockLogin.mockResolvedValue({ sucesso: true, token: "t", refreshToken: "r", usuario: {} });
    const { getByLabelText, getByRole } = await renderComTema(<EntrarScreen onEsqueciSenha={jest.fn()} onCriarConta={jest.fn()} />);

    await digitar(getByLabelText("E-mail"), "ana@exemplo.com");
    await digitar(getByLabelText("Senha"), "123456");
    await pressionar(getByRole("button", { name: "Entrar" }));

    expect(anunciar).not.toHaveBeenCalled();
  });
});
