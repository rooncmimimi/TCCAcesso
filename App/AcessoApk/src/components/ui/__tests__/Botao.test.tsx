import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { Botao } from "../Botao";

// `render` é assíncrono no RNTL com React 19, então sempre `await`. O `AcessibilidadeProvider` é
// obrigatório porque o `TemaProvider` lê as preferências dele e renderiza `null` até o AsyncStorage
// mockado responder; o `waitFor` espera essa leitura.
async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("Botao", () => {
  it("renderiza o texto recebido", async () => {
    const { getByText } = await renderWithTheme(<Botao>Entrar</Botao>);
    expect(getByText("Entrar")).toBeTruthy();
  });

  it("expõe accessibilityRole=button e o texto como label padrão", async () => {
    const { getByRole } = await renderWithTheme(<Botao>Entrar</Botao>);
    expect(getByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("não chama onPress quando disabled", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(
      <Botao disabled onPress={onPress}>
        Entrar
      </Botao>,
    );
    fireEvent.press(getByRole("button", { name: "Entrar" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("chama onPress quando habilitado", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(<Botao onPress={onPress}>Entrar</Botao>);
    fireEvent.press(getByRole("button", { name: "Entrar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("com loading, marca accessibilityState.busy e não chama onPress", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(
      <Botao carregando onPress={onPress}>
        Enviando
      </Botao>,
    );
    const button = getByRole("button", { name: "Enviando" });
    expect(button.props.accessibilityState.busy).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("ao ganhar foco (teclado físico/D-pad/switch access), mostra o anel de foco do token de acessibilidade", async () => {
    const { getByRole } = await renderWithTheme(<Botao>Entrar</Botao>);
    const button = getByRole("button", { name: "Entrar" });

    await act(async () => {
      fireEvent(button, "focus");
    });

    await waitFor(() => {
      const estilo = StyleSheet.flatten(button.props.style);
      expect(estilo.borderWidth).toBe(2); // tema.a11y.focusRingWidth padrão (sem enhancedFocus)
    });

    await act(async () => {
      fireEvent(button, "blur");
    });

    await waitFor(() => {
      const estilo = StyleSheet.flatten(button.props.style);
      expect(estilo.borderWidth).toBe(0); // variante "primary": sem borda quando não está focado
    });
  });
});
