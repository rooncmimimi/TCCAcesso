import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { Input } from "../Input";

// `AccessibilityProvider` (Fase 5) é obrigatório: `ThemeProvider` lê
// preferências dele e renderiza `null` até a leitura inicial do
// AsyncStorage mockado terminar.
async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("Input", () => {
  it("renderiza o label", async () => {
    const { getByText } = await renderWithTheme(<Input label="E-mail" />);
    expect(getByText("E-mail")).toBeTruthy();
  });

  it("usa o label como accessibilityLabel quando nenhum é passado explicitamente", async () => {
    const { getByLabelText } = await renderWithTheme(<Input label="E-mail" placeholder="voce@exemplo.com" />);
    expect(getByLabelText("E-mail")).toBeTruthy();
  });

  it("mostra a mensagem de erro com accessibilityRole=alert e accessibilityLiveRegion=assertive", async () => {
    const { getByText } = await renderWithTheme(<Input label="E-mail" error="Campo obrigatório." />);
    const error = getByText("Campo obrigatório.");
    expect(error.props.accessibilityRole).toBe("alert");
    // No Android, é o `accessibilityLiveRegion` (não o `accessibilityRole`
    // sozinho) que faz o TalkBack anunciar a mensagem automaticamente
    // quando ela aparece (Fase 5, item 21).
    expect(error.props.accessibilityLiveRegion).toBe("assertive");
  });

  it("sem erro, mostra o helperText no lugar", async () => {
    const { getByText } = await renderWithTheme(<Input label="E-mail" helperText="Usado para entrar." />);
    expect(getByText("Usado para entrar.")).toBeTruthy();
  });

  it("ao focar, o campo usa a cor e a espessura do token de foco da acessibilidade", async () => {
    const { getByLabelText } = await renderWithTheme(<Input label="E-mail" />);
    const campo = getByLabelText("E-mail");

    await act(async () => {
      fireEvent(campo, "focus");
    });

    await waitFor(() => {
      const estilo = campo.props.style.find((parte: { borderWidth?: number }) => parte?.borderWidth !== undefined);
      expect(estilo.borderWidth).toBe(2); // theme.a11y.focusRingWidth padrão
    });
  });
});
