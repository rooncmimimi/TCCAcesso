import { render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { Etiqueta, type VarianteEtiqueta } from "../Etiqueta";

// O `AcessibilidadeProvider` é obrigatório: o `TemaProvider` lê as preferências dele e renderiza
// `null` até o AsyncStorage mockado responder.
async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("Etiqueta", () => {
  const variants: VarianteEtiqueta[] = ["success", "warning", "error", "info", "neutral"];

  it.each(variants)("renderiza o texto na variante %s", async (variant) => {
    const { getByText } = await renderWithTheme(<Etiqueta variant={variant}>Rótulo</Etiqueta>);
    expect(getByText("Rótulo")).toBeTruthy();
  });
});
