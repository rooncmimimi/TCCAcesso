/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockEsqueciSenha = jest.fn();

jest.mock("../../../auth", () => ({
  AuthService: {
    esqueciSenha: (...args: unknown[]) => mockEsqueciSenha(...args),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { ForgotPasswordScreen } from "../ForgotPasswordScreen";

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <ForgotPasswordScreen onVoltar={jest.fn()} onTenhoCodigo={jest.fn()} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

/**
 * Teste focado na correção de acessibilidade da Fase 7 (não uma suíte
 * comportamental completa da tela, que nunca existiu e está fora do escopo
 * desta auditoria) — protege exatamente o problema encontrado: a mensagem
 * de confirmação era comunicada só visualmente.
 */
describe("ForgotPasswordScreen — acessibilidade (Fase 7)", () => {
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
