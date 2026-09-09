import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { ToggleRow } from "../ToggleRow";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ToggleRow", () => {
  it("renderiza o rótulo, a descrição e o valor atual do switch", async () => {
    const { getByText, getByLabelText } = await renderWithTheme(
      <ToggleRow label="Alto contraste" description="Aumenta o contraste." value={false} onValueChange={jest.fn()} />,
    );
    expect(getByText("Alto contraste")).toBeTruthy();
    expect(getByText("Aumenta o contraste.")).toBeTruthy();
    expect(getByLabelText("Alto contraste").props.value).toBe(false);
  });

  it("sem description, não quebra e não renderiza um texto vazio no lugar", async () => {
    const { getByText, queryByText } = await renderWithTheme(
      <ToggleRow label="Foco ampliado" value={true} onValueChange={jest.fn()} />,
    );
    expect(getByText("Foco ampliado")).toBeTruthy();
    expect(queryByText("undefined")).toBeNull();
  });

  it("alterar o switch chama onValueChange com o novo valor", async () => {
    const onValueChange = jest.fn();
    const { getByLabelText } = await renderWithTheme(
      <ToggleRow label="Reduzir animações" value={false} onValueChange={onValueChange} />,
    );

    fireEvent(getByLabelText("Reduzir animações"), "valueChange", true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
