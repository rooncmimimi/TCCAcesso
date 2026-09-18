import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { EstadoVazio } from "../EstadoVazio";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("EstadoVazio", () => {
  it("mostra título e descrição quando o título é informado", async () => {
    const { getByText } = await renderWithTheme(
      <EstadoVazio titulo="Nenhuma vaga encontrada" descricao="Volte mais tarde." />,
    );
    expect(getByText("Nenhuma vaga encontrada")).toBeTruthy();
    expect(getByText("Volte mais tarde.")).toBeTruthy();
  });

  it("sem título: mostra só a descrição (mesmo caso de ListaSeguidoresScreen/UsuariosBloqueadosScreen)", async () => {
    const { getByText, queryByRole } = await renderWithTheme(
      <EstadoVazio descricao="Você não bloqueou ninguém ainda." />,
    );
    expect(getByText("Você não bloqueou ninguém ainda.")).toBeTruthy();
    expect(queryByRole("header")).toBeNull();
  });

  it("com 'action': mostra o botão e chama onPress ao tocar", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(
      <EstadoVazio descricao="Nenhum resultado." acao={{ rotulo: "Limpar filtros", onPress }} />,
    );
    fireEvent.press(getByRole("button", { name: "Limpar filtros" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("sem 'action': não mostra nenhum botão", async () => {
    const { queryByRole } = await renderWithTheme(<EstadoVazio descricao="Nenhum resultado." />);
    expect(queryByRole("button")).toBeNull();
  });
});
