/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockRedefinirSenha = jest.fn();
const mockAnnounce = jest.fn();

jest.mock("../../../auth", () => ({
  AuthService: {
    redefinirSenha: (...args: unknown[]) => mockRedefinirSenha(...args),
  },
}));

// Preserva o `AccessibilityProvider`/`useAccessibility` reais (o
// `ThemeProvider` depende deles) e troca só `announceForAccessibility` por
// um espião — mockar o módulo inteiro sem isso quebraria a árvore de
// providers que a própria tela precisa para renderizar.
jest.mock("../../../accessibility", () => ({
  ...jest.requireActual("../../../accessibility"),
  announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { ResetPasswordScreen } from "../ResetPasswordScreen";

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <ResetPasswordScreen emailInicial="ana@exemplo.com" onVoltar={jest.fn()} onConcluido={jest.fn()} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

/**
 * Teste focado na correção de acessibilidade da Fase 7 (não uma suíte
 * comportamental completa da tela, que nunca existiu e está fora do escopo
 * desta auditoria) — protege exatamente o problema encontrado: a troca do
 * formulário inteiro pelo card de sucesso não avisava um usuário de
 * TalkBack de que algo mudou.
 */
describe("ResetPasswordScreen — acessibilidade (Fase 7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ao redefinir a senha com sucesso, anuncia a mudança de tela via announceForAccessibility", async () => {
    mockRedefinirSenha.mockResolvedValue(undefined);
    const { getByLabelText, getByRole, findByText } = await renderTela();

    await act(async () => {
      fireEvent.changeText(getByLabelText("Código"), "123456");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Nova senha"), "SenhaForte#1");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Confirmar nova senha"), "SenhaForte#1");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Redefinir senha" }));
    });

    expect(await findByText("Senha redefinida")).toBeTruthy();
    expect(mockAnnounce).toHaveBeenCalledWith("Senha redefinida com sucesso.");
  });
});
