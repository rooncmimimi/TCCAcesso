import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { EmptyState } from "../EmptyState";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("EmptyState", () => {
  it("mostra título e descrição quando o título é informado", async () => {
    const { getByText } = await renderWithTheme(
      <EmptyState title="Nenhuma vaga encontrada" description="Volte mais tarde." />,
    );
    expect(getByText("Nenhuma vaga encontrada")).toBeTruthy();
    expect(getByText("Volte mais tarde.")).toBeTruthy();
  });

  it("sem título: mostra só a descrição (mesmo caso de FollowListScreen/BlockedUsersScreen)", async () => {
    const { getByText, queryByRole } = await renderWithTheme(
      <EmptyState description="Você não bloqueou ninguém ainda." />,
    );
    expect(getByText("Você não bloqueou ninguém ainda.")).toBeTruthy();
    expect(queryByRole("header")).toBeNull();
  });

  it("com 'action': mostra o botão e chama onPress ao tocar", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(
      <EmptyState description="Nenhum resultado." action={{ label: "Limpar filtros", onPress }} />,
    );
    fireEvent.press(getByRole("button", { name: "Limpar filtros" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("sem 'action': não mostra nenhum botão", async () => {
    const { queryByRole } = await renderWithTheme(<EmptyState description="Nenhum resultado." />);
    expect(queryByRole("button")).toBeNull();
  });
});
