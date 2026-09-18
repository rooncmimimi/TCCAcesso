import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { LinhaInterruptor } from "../LinhaInterruptor";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("LinhaInterruptor", () => {
  it("renderiza o rótulo, a descrição e o valor atual do switch", async () => {
    const { getByText, getByLabelText } = await renderWithTheme(
      <LinhaInterruptor rotulo="Alto contraste" descricao="Aumenta o contraste." value={false} onValueChange={jest.fn()} />,
    );
    expect(getByText("Alto contraste")).toBeTruthy();
    expect(getByText("Aumenta o contraste.")).toBeTruthy();
    expect(getByLabelText("Alto contraste").props.value).toBe(false);
  });

  it("sem description, não quebra e não renderiza um texto vazio no lugar", async () => {
    const { getByText, queryByText } = await renderWithTheme(
      <LinhaInterruptor rotulo="Foco ampliado" value={true} onValueChange={jest.fn()} />,
    );
    expect(getByText("Foco ampliado")).toBeTruthy();
    expect(queryByText("undefined")).toBeNull();
  });

  it("alterar o switch chama onValueChange com o novo valor", async () => {
    const onValueChange = jest.fn();
    const { getByLabelText } = await renderWithTheme(
      <LinhaInterruptor rotulo="Reduzir animações" value={false} onValueChange={onValueChange} />,
    );

    fireEvent(getByLabelText("Reduzir animações"), "valueChange", true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
