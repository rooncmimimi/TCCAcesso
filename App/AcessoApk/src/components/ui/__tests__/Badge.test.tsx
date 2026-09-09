import { render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { Badge, type BadgeVariant } from "../Badge";

// `AccessibilityProvider` (Fase 5) é obrigatório: `ThemeProvider` lê
// preferências dele e renderiza `null` até a leitura inicial do
// AsyncStorage mockado terminar.
async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("Badge", () => {
  const variants: BadgeVariant[] = ["success", "warning", "error", "info", "neutral"];

  it.each(variants)("renderiza o texto na variante %s", async (variant) => {
    const { getByText } = await renderWithTheme(<Badge variant={variant}>Rótulo</Badge>);
    expect(getByText("Rótulo")).toBeTruthy();
  });
});
