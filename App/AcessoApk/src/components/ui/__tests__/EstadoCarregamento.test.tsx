import { render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { EstadoCarregamento } from "../EstadoCarregamento";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("EstadoCarregamento", () => {
  it("mostra um indicador de carregamento anunciado por leitores de tela ('Carregando' por padrão)", async () => {
    const { getByLabelText } = await renderWithTheme(<EstadoCarregamento />);
    expect(getByLabelText("Carregando")).toBeTruthy();
  });

  it("aceita um rótulo customizado", async () => {
    const { getByLabelText } = await renderWithTheme(<EstadoCarregamento rotulo="Carregando seu perfil" />);
    expect(getByLabelText("Carregando seu perfil")).toBeTruthy();
  });
});
