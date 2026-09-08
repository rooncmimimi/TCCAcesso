import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { SegmentedControl } from "../SegmentedControl";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

const OPCOES = [
  { label: "Pequeno", value: "small" as const },
  { label: "Médio", value: "medium" as const },
  { label: "Grande", value: "large" as const },
];

describe("SegmentedControl", () => {
  it("renderiza o rótulo do grupo e todas as opções", async () => {
    const { getByText, getByLabelText } = await renderWithTheme(
      <SegmentedControl label="Tamanho" value="medium" onChange={jest.fn()} options={OPCOES} />,
    );
    expect(getByText("Tamanho")).toBeTruthy();
    expect(getByLabelText("Pequeno")).toBeTruthy();
    expect(getByLabelText("Médio")).toBeTruthy();
    expect(getByLabelText("Grande")).toBeTruthy();
  });

  it("marca accessibilityState.selected só na opção correspondente ao value atual", async () => {
    const { getByLabelText } = await renderWithTheme(
      <SegmentedControl label="Tamanho" value="medium" onChange={jest.fn()} options={OPCOES} />,
    );
    expect(getByLabelText("Pequeno").props.accessibilityState.selected).toBe(false);
    expect(getByLabelText("Médio").props.accessibilityState.selected).toBe(true);
    expect(getByLabelText("Grande").props.accessibilityState.selected).toBe(false);
  });

  it("o grupo tem accessibilityRole=radiogroup e cada opção accessibilityRole=radio", async () => {
    const { getByLabelText } = await renderWithTheme(
      <SegmentedControl label="Tamanho" value="medium" onChange={jest.fn()} options={OPCOES} />,
    );
    expect(getByLabelText("Tamanho").props.accessibilityRole).toBe("radiogroup");
    expect(getByLabelText("Grande").props.accessibilityRole).toBe("radio");
  });

  it("tocar numa opção chama onChange com o value dela", async () => {
    const onChange = jest.fn();
    const { getByLabelText } = await renderWithTheme(
      <SegmentedControl label="Tamanho" value="medium" onChange={onChange} options={OPCOES} />,
    );

    fireEvent.press(getByLabelText("Grande"));

    expect(onChange).toHaveBeenCalledWith("large");
  });
});
