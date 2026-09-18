import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { ControleSegmentado } from "../ControleSegmentado";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

const OPCOES = [
  { rotulo: "Pequeno", value: "small" as const },
  { rotulo: "Médio", value: "medium" as const },
  { rotulo: "Grande", value: "large" as const },
];

describe("ControleSegmentado", () => {
  it("renderiza o rótulo do grupo e todas as opções", async () => {
    const { getByText, getByLabelText } = await renderWithTheme(
      <ControleSegmentado rotulo="Tamanho" value="medium" onChange={jest.fn()} opcoes={OPCOES} />,
    );
    expect(getByText("Tamanho")).toBeTruthy();
    expect(getByLabelText("Pequeno")).toBeTruthy();
    expect(getByLabelText("Médio")).toBeTruthy();
    expect(getByLabelText("Grande")).toBeTruthy();
  });

  it("marca accessibilityState.selected só na opção correspondente ao value atual", async () => {
    const { getByLabelText } = await renderWithTheme(
      <ControleSegmentado rotulo="Tamanho" value="medium" onChange={jest.fn()} opcoes={OPCOES} />,
    );
    expect(getByLabelText("Pequeno").props.accessibilityState.selected).toBe(false);
    expect(getByLabelText("Médio").props.accessibilityState.selected).toBe(true);
    expect(getByLabelText("Grande").props.accessibilityState.selected).toBe(false);
  });

  it("o grupo tem accessibilityRole=radiogroup e cada opção accessibilityRole=radio", async () => {
    const { getByLabelText } = await renderWithTheme(
      <ControleSegmentado rotulo="Tamanho" value="medium" onChange={jest.fn()} opcoes={OPCOES} />,
    );
    expect(getByLabelText("Tamanho").props.accessibilityRole).toBe("radiogroup");
    expect(getByLabelText("Grande").props.accessibilityRole).toBe("radio");
  });

  it("tocar numa opção chama onChange com o value dela", async () => {
    const onChange = jest.fn();
    const { getByLabelText } = await renderWithTheme(
      <ControleSegmentado rotulo="Tamanho" value="medium" onChange={onChange} opcoes={OPCOES} />,
    );

    fireEvent.press(getByLabelText("Grande"));

    expect(onChange).toHaveBeenCalledWith("large");
  });
});
