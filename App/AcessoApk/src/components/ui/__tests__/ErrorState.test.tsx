import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { ErrorState } from "../ErrorState";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ErrorState", () => {
  it("mostra título e mensagem como alerta (assertive) e chama onRetry ao tocar em 'Tentar novamente'", async () => {
    const onRetry = jest.fn();
    const { getByText, getByRole } = await renderWithTheme(
      <ErrorState title="Não foi possível carregar" message="Verifique sua conexão." onRetry={onRetry} />,
    );

    const titulo = getByText("Não foi possível carregar");
    expect(titulo.props.accessibilityRole).toBe("alert");
    expect(titulo.props.accessibilityLiveRegion).toBe("assertive");
    expect(getByText("Verifique sua conexão.")).toBeTruthy();

    fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("sem 'retrying': o botão não fica em loading nem desabilitado", async () => {
    const { getByRole } = await renderWithTheme(
      <ErrorState title="Erro" message="Mensagem" onRetry={() => {}} />,
    );
    const botao = getByRole("button", { name: "Tentar novamente" });
    expect(botao.props.accessibilityState.disabled).toBeFalsy();
  });

  it("com 'retrying=true': o botão fica desabilitado", async () => {
    const { getByRole } = await renderWithTheme(
      <ErrorState title="Erro" message="Mensagem" onRetry={() => {}} retrying />,
    );
    const botao = getByRole("button", { name: "Tentar novamente" });
    expect(botao.props.accessibilityState.disabled).toBe(true);
  });
});
