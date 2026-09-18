import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { CampoTexto } from "../CampoTexto";

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

describe("CampoTexto", () => {
  it("renderiza o label", async () => {
    const { getByText } = await renderWithTheme(<CampoTexto rotulo="E-mail" />);
    expect(getByText("E-mail")).toBeTruthy();
  });

  it("usa o label como accessibilityLabel quando nenhum é passado explicitamente", async () => {
    const { getByLabelText } = await renderWithTheme(<CampoTexto rotulo="E-mail" placeholder="voce@exemplo.com" />);
    expect(getByLabelText("E-mail")).toBeTruthy();
  });

  it("mostra a mensagem de erro com accessibilityRole=alert e accessibilityLiveRegion=assertive", async () => {
    const { getByText } = await renderWithTheme(<CampoTexto rotulo="E-mail" erro="Campo obrigatório." />);
    const error = getByText("Campo obrigatório.");
    expect(error.props.accessibilityRole).toBe("alert");
    // No Android é o `accessibilityLiveRegion`, e não só o `accessibilityRole`, que faz o TalkBack
    // anunciar a mensagem quando ela aparece.
    expect(error.props.accessibilityLiveRegion).toBe("assertive");
  });

  it("sem erro, mostra o helperText no lugar", async () => {
    const { getByText } = await renderWithTheme(<CampoTexto rotulo="E-mail" textoAjuda="Usado para entrar." />);
    expect(getByText("Usado para entrar.")).toBeTruthy();
  });

  it("ao focar, o campo usa a cor e a espessura do token de foco da acessibilidade", async () => {
    const { getByLabelText } = await renderWithTheme(<CampoTexto rotulo="E-mail" />);
    const campo = getByLabelText("E-mail");

    await act(async () => {
      fireEvent(campo, "focus");
    });

    await waitFor(() => {
      const estilo = campo.props.style.find((parte: { borderWidth?: number }) => parte?.borderWidth !== undefined);
      expect(estilo.borderWidth).toBe(2); // tema.a11y.focusRingWidth padrão
    });
  });
});
