/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockRegisterCandidato = jest.fn();
const mockRegisterEmpresa = jest.fn();
const mockReenviarConfirmacao = jest.fn();
const mockConfirmarCadastro = jest.fn();

jest.mock("../../../auth", () => ({
  useAuth: () => ({
    registerCandidato: mockRegisterCandidato,
    registerEmpresa: mockRegisterEmpresa,
  }),
  AuthService: {
    reenviarConfirmacao: (...args: unknown[]) => mockReenviarConfirmacao(...args),
    confirmarCadastro: (...args: unknown[]) => mockConfirmarCadastro(...args),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { RegisterScreen } from "../RegisterScreen";

async function pressionar(elemento: ReturnType<typeof import("@testing-library/react-native").screen.getByRole>) {
  await act(async () => {
    fireEvent.press(elemento);
  });
}

async function renderTela(onVoltarParaLogin = jest.fn()) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <RegisterScreen onVoltarParaLogin={onVoltarParaLogin} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

/** Preenche os campos comuns válidos (candidato) — atalho usado por vários testes. */
async function preencherFormularioCandidatoValido(utils: Awaited<ReturnType<typeof renderTela>>) {
  const { getByLabelText } = utils;
  await act(async () => {
    fireEvent.changeText(getByLabelText("Nome"), "Ana Beatriz");
  });
  await act(async () => {
    fireEvent.changeText(getByLabelText("E-mail"), "ana@exemplo.com");
  });
  await act(async () => {
    fireEvent.changeText(getByLabelText("Senha"), "SenhaForte#1");
  });
  await act(async () => {
    fireEvent.changeText(getByLabelText("Confirmar senha"), "SenhaForte#1");
  });
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("os campos de senha começam ocultos e alternam juntos ao tocar em 'Mostrar senha'", async () => {
    const utils = await renderTela();
    expect(utils.getByLabelText("Senha").props.secureTextEntry).toBe(true);
    expect(utils.getByLabelText("Confirmar senha").props.secureTextEntry).toBe(true);

    await pressionar(utils.getByLabelText("Mostrar senha"));

    expect(utils.getByLabelText("Senha").props.secureTextEntry).toBe(false);
    expect(utils.getByLabelText("Confirmar senha").props.secureTextEntry).toBe(false);
  });

  it("começa no tipo 'Candidato', sem os campos de empresa", async () => {
    const utils = await renderTela();
    expect(utils.getByLabelText("CPF")).toBeTruthy();
    expect(utils.queryByLabelText("CNPJ")).toBeNull();
  });

  it("ao trocar para 'Empresa', mostra CNPJ/Razão social e some com CPF", async () => {
    const utils = await renderTela();
    await pressionar(utils.getByLabelText("Empresa"));

    expect(utils.getByLabelText("CNPJ")).toBeTruthy();
    expect(utils.getByLabelText("Razão social")).toBeTruthy();
    expect(utils.queryByLabelText("CPF")).toBeNull();
  });

  it("com campos obrigatórios vazios, não chama o cadastro — mostra erro", async () => {
    const utils = await renderTela();
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));

    expect(await utils.findByText("Preencha todos os campos obrigatórios.")).toBeTruthy();
    expect(mockRegisterCandidato).not.toHaveBeenCalled();
  });

  it("com senhas diferentes, não chama o cadastro — mostra erro", async () => {
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Confirmar senha"), "OutraSenha#1");
    });
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));

    expect(await utils.findByText("As senhas não coincidem.")).toBeTruthy();
    expect(mockRegisterCandidato).not.toHaveBeenCalled();
  });

  it("candidato: cadastro válido chama registerCandidato com o payload certo (sem senha de confirmação)", async () => {
    mockRegisterCandidato.mockResolvedValue({ sucesso: true, pendenteVerificacaoEmail: true, email: "ana@exemplo.com" });
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));

    expect(mockRegisterCandidato).toHaveBeenCalledWith({
      nome: "Ana Beatriz",
      email: "ana@exemplo.com",
      senha: "SenhaForte#1",
      telefone: undefined,
      cpf: undefined,
    });
  });

  it("empresa: exige CNPJ e razão social antes de chamar o cadastro", async () => {
    const utils = await renderTela();
    await pressionar(utils.getByLabelText("Empresa"));
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Nome"), "Fulano");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("E-mail"), "empresa@exemplo.com");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Senha"), "SenhaForte#1");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Confirmar senha"), "SenhaForte#1");
    });
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));

    expect(await utils.findByText("Preencha o CNPJ e a razão social.")).toBeTruthy();
    expect(mockRegisterEmpresa).not.toHaveBeenCalled();
  });

  it("empresa: cadastro válido chama registerEmpresa com o payload certo", async () => {
    mockRegisterEmpresa.mockResolvedValue({ sucesso: true, pendenteVerificacaoEmail: true, email: "empresa@exemplo.com" });
    const utils = await renderTela();
    await pressionar(utils.getByLabelText("Empresa"));
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Nome"), "Fulano");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("E-mail"), "empresa@exemplo.com");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("CNPJ"), "12345678901234");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Razão social"), "ACME Ltda");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Senha"), "SenhaForte#1");
    });
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Confirmar senha"), "SenhaForte#1");
    });
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));

    expect(mockRegisterEmpresa).toHaveBeenCalledWith({
      nome: "Fulano",
      email: "empresa@exemplo.com",
      senha: "SenhaForte#1",
      telefone: undefined,
      cnpj: "12345678901234",
      razaoSocial: "ACME Ltda",
      nomeFantasia: undefined,
    });
  });

  it("em erro (ex.: e-mail já cadastrado), mostra a mensagem amigável e permanece no formulário", async () => {
    const erro409 = Object.assign(new Error("409"), {
      isAxiosError: true,
      response: { data: { mensagem: "Este e-mail já está cadastrado." } },
    });
    mockRegisterCandidato.mockRejectedValue(erro409);
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));

    const mensagem = await utils.findByText("Este e-mail já está cadastrado.");
    expect(mensagem.props.accessibilityLiveRegion).toBe("assertive");
    expect(utils.getByLabelText("Nome")).toBeTruthy(); // continua no formulário
  });

  it("duplo toque em 'Criar conta' dispara só uma chamada", async () => {
    let resolver: (valor: unknown) => void = () => {};
    mockRegisterCandidato.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);

    const botao = utils.getByRole("button", { name: "Criar conta" });
    await pressionar(botao);
    await pressionar(botao);

    expect(mockRegisterCandidato).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolver({ sucesso: true, pendenteVerificacaoEmail: true, email: "ana@exemplo.com" });
    });
  });

  it("pendenteVerificacaoEmail leva à etapa de confirmação, anunciando a transição", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    mockRegisterCandidato.mockResolvedValue({ sucesso: true, pendenteVerificacaoEmail: true, email: "ana@exemplo.com" });
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));

    expect(await utils.findByText("Confirme seu e-mail")).toBeTruthy();
    expect(anunciar).toHaveBeenCalledWith("Cadastro enviado. Confirme seu e-mail.");
  });

  it("confirmar e-mail com sucesso leva à etapa de boas-vindas, anunciando a transição", async () => {
    mockRegisterCandidato.mockResolvedValue({ sucesso: true, pendenteVerificacaoEmail: true, email: "ana@exemplo.com" });
    mockConfirmarCadastro.mockResolvedValue({ mensagem: "E-mail confirmado com sucesso." });
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));
    await utils.findByText("Confirme seu e-mail");

    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Código de confirmação"), "123456");
    });
    await pressionar(utils.getByRole("button", { name: "Confirmar e-mail" }));

    expect(mockConfirmarCadastro).toHaveBeenCalledWith("ana@exemplo.com", "123456");
    expect(await utils.findByText(/Bem-vindo\(a\) ao ACESSO, Ana!/)).toBeTruthy();
    expect(anunciar).toHaveBeenCalledWith("E-mail confirmado. Bem-vindo ao ACESSO.");
  });

  it("na etapa de boas-vindas, 'Ir para o login' devolve o e-mail cadastrado", async () => {
    const onVoltarParaLogin = jest.fn();
    mockRegisterCandidato.mockResolvedValue({ sucesso: true, pendenteVerificacaoEmail: true, email: "ana@exemplo.com" });
    mockConfirmarCadastro.mockResolvedValue({ mensagem: "ok" });
    const utils = await renderTela(onVoltarParaLogin);
    await preencherFormularioCandidatoValido(utils);
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));
    await utils.findByText("Confirme seu e-mail");
    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Código de confirmação"), "123456");
    });
    await pressionar(utils.getByRole("button", { name: "Confirmar e-mail" }));
    await utils.findByText(/Bem-vindo/);

    await pressionar(utils.getByRole("button", { name: "Ir para o login" }));

    expect(onVoltarParaLogin).toHaveBeenCalledWith("ana@exemplo.com");
  });

  it("código de confirmação errado mostra mensagem amigável, sem sair da etapa de confirmação", async () => {
    mockRegisterCandidato.mockResolvedValue({ sucesso: true, pendenteVerificacaoEmail: true, email: "ana@exemplo.com" });
    const erro400 = Object.assign(new Error("400"), {
      isAxiosError: true,
      response: { data: { mensagem: "Código inválido ou expirado." } },
    });
    mockConfirmarCadastro.mockRejectedValue(erro400);
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));
    await utils.findByText("Confirme seu e-mail");

    await act(async () => {
      fireEvent.changeText(utils.getByLabelText("Código de confirmação"), "000000");
    });
    await pressionar(utils.getByRole("button", { name: "Confirmar e-mail" }));

    expect(await utils.findByText("Código inválido ou expirado.")).toBeTruthy();
    expect(utils.getByLabelText("Código de confirmação")).toBeTruthy(); // continua na etapa
  });

  it("reenviar código com sucesso mostra confirmação com accessibilityLiveRegion=polite", async () => {
    mockRegisterCandidato.mockResolvedValue({ sucesso: true, pendenteVerificacaoEmail: true, email: "ana@exemplo.com" });
    mockReenviarConfirmacao.mockResolvedValue(undefined);
    const utils = await renderTela();
    await preencherFormularioCandidatoValido(utils);
    await pressionar(utils.getByRole("button", { name: "Criar conta" }));
    await utils.findByText("Confirme seu e-mail");

    await pressionar(utils.getByRole("button", { name: "Reenviar código" }));

    const confirmacao = await utils.findByText("Código reenviado.");
    expect(confirmacao.props.accessibilityLiveRegion).toBe("polite");
  });

  it("'Já tenho conta' chama onVoltarParaLogin sem e-mail (não confirmou nada ainda)", async () => {
    const onVoltarParaLogin = jest.fn();
    const utils = await renderTela(onVoltarParaLogin);

    await pressionar(utils.getByRole("button", { name: "Já tenho conta" }));

    expect(onVoltarParaLogin).toHaveBeenCalledWith();
  });
});
