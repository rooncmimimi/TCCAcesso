import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { EstadoErro } from "../EstadoErro";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("EstadoErro", () => {
  it("mostra título e mensagem como alerta (assertive) e chama onRetry ao tocar em 'Tentar novamente'", async () => {
    const onRetry = jest.fn();
    const { getByText, getByRole } = await renderWithTheme(
      <EstadoErro titulo="Não foi possível carregar" mensagem="Verifique sua conexão." onTentarNovamente={onRetry} />,
    );

    const titulo = getByText("Não foi possível carregar");
    expect(titulo.props.accessibilityRole).toBe("alert");
    expect(titulo.props.accessibilityLiveRegion).toBe("assertive");
    expect(getByText("Verifique sua conexão.")).toBeTruthy();

    fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("sem 'retrying': o botão não fica em loading nem desabilitado", async () => {
    const { getByRole } = await renderWithTheme(
      <EstadoErro titulo="Erro" mensagem="Mensagem" onTentarNovamente={() => {}} />,
    );
    const botao = getByRole("button", { name: "Tentar novamente" });
    expect(botao.props.accessibilityState.disabled).toBeFalsy();
  });

  it("com 'retrying=true': o botão fica desabilitado", async () => {
    const { getByRole } = await renderWithTheme(
      <EstadoErro titulo="Erro" mensagem="Mensagem" onTentarNovamente={() => {}} tentandoNovamente />,
    );
    const botao = getByRole("button", { name: "Tentar novamente" });
    expect(botao.props.accessibilityState.disabled).toBe(true);
  });
});
