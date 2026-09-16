import { render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { LoadingState } from "../LoadingState";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("LoadingState", () => {
  it("mostra um indicador de carregamento anunciado por leitores de tela ('Carregando' por padrão)", async () => {
    const { getByLabelText } = await renderWithTheme(<LoadingState />);
    expect(getByLabelText("Carregando")).toBeTruthy();
  });

  it("aceita um rótulo customizado", async () => {
    const { getByLabelText } = await renderWithTheme(<LoadingState label="Carregando seu perfil" />);
    expect(getByLabelText("Carregando seu perfil")).toBeTruthy();
  });
});
