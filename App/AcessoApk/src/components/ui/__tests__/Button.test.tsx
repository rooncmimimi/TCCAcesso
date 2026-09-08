import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { Button } from "../Button";

// `render` é assíncrono nesta versão do RNTL (React 19) — sempre `await`.
// `AccessibilityProvider` (Fase 5) é obrigatório porque `ThemeProvider`
// agora lê preferências dele; ele renderiza `null` enquanto lê o
// AsyncStorage mockado, então `waitFor` espera essa primeira leitura
// terminar antes de devolver a árvore para os testes consultarem.
async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("Button", () => {
  it("renderiza o texto recebido", async () => {
    const { getByText } = await renderWithTheme(<Button>Entrar</Button>);
    expect(getByText("Entrar")).toBeTruthy();
  });

  it("expõe accessibilityRole=button e o texto como label padrão", async () => {
    const { getByRole } = await renderWithTheme(<Button>Entrar</Button>);
    expect(getByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("não chama onPress quando disabled", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(
      <Button disabled onPress={onPress}>
        Entrar
      </Button>,
    );
    fireEvent.press(getByRole("button", { name: "Entrar" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("chama onPress quando habilitado", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(<Button onPress={onPress}>Entrar</Button>);
    fireEvent.press(getByRole("button", { name: "Entrar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("com loading, marca accessibilityState.busy e não chama onPress", async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithTheme(
      <Button loading onPress={onPress}>
        Enviando
      </Button>,
    );
    const button = getByRole("button", { name: "Enviando" });
    expect(button.props.accessibilityState.busy).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("ao ganhar foco (teclado físico/D-pad/switch access), mostra o anel de foco do token de acessibilidade", async () => {
    const { getByRole } = await renderWithTheme(<Button>Entrar</Button>);
    const button = getByRole("button", { name: "Entrar" });

    await act(async () => {
      fireEvent(button, "focus");
    });

    await waitFor(() => {
      const estilo = StyleSheet.flatten(button.props.style);
      expect(estilo.borderWidth).toBe(2); // theme.a11y.focusRingWidth padrão (sem enhancedFocus)
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
