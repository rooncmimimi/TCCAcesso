/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockEsqueciSenha = jest.fn();

jest.mock("../../../autenticacao", () => ({
  AutenticacaoService: {
    esqueciSenha: (...args: unknown[]) => mockEsqueciSenha(...args),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { RecuperarSenhaScreen } from "../RecuperarSenhaScreen";

async function renderTela() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <RecuperarSenhaScreen onVoltar={jest.fn()} onTenhoCodigo={jest.fn()} />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

/**
 * Cobre a acessibilidade da confirmação, que antes era só visual; não é uma suíte completa da tela.
 */
describe("RecuperarSenhaScreen — acessibilidade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("a mensagem de confirmação de envio é anunciada automaticamente pelo TalkBack (accessibilityLiveRegion=polite)", async () => {
    mockEsqueciSenha.mockResolvedValue({ mensagem: "Instruções enviadas para o seu e-mail." });
    const { getByLabelText, getByRole, findByText } = await renderTela();

    await act(async () => {
      fireEvent.changeText(getByLabelText("E-mail"), "ana@exemplo.com");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Enviar instruções" }));
    });

    const mensagem = await findByText("Instruções enviadas para o seu e-mail.");
    expect(mensagem.props.accessibilityLiveRegion).toBe("polite");
  });
});
