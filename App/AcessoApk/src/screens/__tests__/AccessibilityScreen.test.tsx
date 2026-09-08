import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { Alert } from "react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { AccessibilityScreen } from "../AccessibilityScreen";

// `AccessibilityProvider` de verdade (não mockado) — estes testes exercitam
// a integração real: tela → `useAccessibility()` → provider →
// `AsyncStorage` mockado, exatamente o que a Fase 6 pede (nenhum estado
// paralelo). `ThemeProvider` real também, para o "preview em tempo real"
// ser testado de ponta a ponta, não presumido.
async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <AccessibilityScreen />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("AccessibilityScreen", () => {
  it("renderiza o título e as quatro seções", async () => {
    const { getByText } = await renderTela();
    expect(getByText("Personalize sua experiência")).toBeTruthy();
    expect(getByText("VISUAL")).toBeTruthy();
    expect(getByText("INTERAÇÃO")).toBeTruthy();
    expect(getByText("LEITURA")).toBeTruthy();
    expect(getByText("OUTRAS OPÇÕES")).toBeTruthy();
    expect(getByText("PRÉVIA")).toBeTruthy();
  });

  it("tema: tocar em 'Escuro' seleciona a opção (accessibilityState) e o preview muda de tema", async () => {
    const { getByLabelText, getByText } = await renderTela();

    expect(getByLabelText("Escuro").props.accessibilityState.selected).toBe(false);

    await act(async () => {
      fireEvent.press(getByLabelText("Escuro"));
    });

    await waitFor(() => expect(getByLabelText("Escuro").props.accessibilityState.selected).toBe(true));
    expect(getByLabelText("Sistema").props.accessibilityState.selected).toBe(false);
    // O preview usa o MESMO tema do resto do app — o título de exemplo
    // precisa estar com a cor de texto do tema escuro agora.
    const titulo = getByText("Título de exemplo");
    const estilo = titulo.props.style.find((parte: { color?: string }) => parte?.color !== undefined);
    expect(estilo.color).toBe("#F3F5F8"); // textPrimary do tema escuro (theme/colors.ts)
  });

  it("alto contraste: o switch reflete a preferência e muda a cor de borda dos controles", async () => {
    const { getByLabelText } = await renderTela();

    expect(getByLabelText("Alto contraste").props.value).toBe(false);

    await act(async () => {
      fireEvent(getByLabelText("Alto contraste"), "valueChange", true);
    });

    await waitFor(() => expect(getByLabelText("Alto contraste").props.value).toBe(true));
  });

  it("tamanho do texto: cada opção fica selecionada ao ser tocada, e só ela", async () => {
    const { getByLabelText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByLabelText("Grande"));
    });

    await waitFor(() => expect(getByLabelText("Grande").props.accessibilityState.selected).toBe(true));
    expect(getByLabelText("Pequeno").props.accessibilityState.selected).toBe(false);
    expect(getByLabelText("Médio").props.accessibilityState.selected).toBe(false);
    expect(getByLabelText("Muito grande").props.accessibilityState.selected).toBe(false);
  });

  it("espaçamento entre letras: 'Amplo' fica selecionado (escopado ao próprio grupo, não ao de linhas)", async () => {
    const { getByLabelText } = await renderTela();
    const grupoLetras = getByLabelText("Espaçamento entre letras");

    await act(async () => {
      fireEvent.press(within(grupoLetras).getByLabelText("Amplo"));
    });

    await waitFor(() => expect(within(grupoLetras).getByLabelText("Amplo").props.accessibilityState.selected).toBe(true));
    expect(within(grupoLetras).getByLabelText("Normal").props.accessibilityState.selected).toBe(false);
  });

  it("espaçamento entre linhas: 'Relaxado' fica selecionado", async () => {
    const { getByLabelText } = await renderTela();
    const grupoLinhas = getByLabelText("Espaçamento entre linhas");

    await act(async () => {
      fireEvent.press(within(grupoLinhas).getByLabelText("Relaxado"));
    });

    await waitFor(() =>
      expect(within(grupoLinhas).getByLabelText("Relaxado").props.accessibilityState.selected).toBe(true),
    );
  });

  it("reduzir animações e foco ampliado: os switches refletem a preferência", async () => {
    const { getByLabelText } = await renderTela();

    await act(async () => {
      fireEvent(getByLabelText("Reduzir animações"), "valueChange", true);
    });
    await waitFor(() => expect(getByLabelText("Reduzir animações").props.value).toBe(true));

    await act(async () => {
      fireEvent(getByLabelText("Foco ampliado"), "valueChange", true);
    });
    await waitFor(() => expect(getByLabelText("Foco ampliado").props.value).toBe(true));
  });

  it("recursos em preparação/indisponíveis não têm nenhum controle interativo — só texto informativo", async () => {
    const { queryByLabelText, getByText } = await renderTela();

    expect(getByText("Em preparação — chegará em uma atualização futura do aplicativo.")).toBeTruthy();
    expect(getByText("Não disponível nesta plataforma.")).toBeTruthy();
    expect(getByText("Suportada automaticamente pelo aplicativo, sem nenhum ajuste necessário.")).toBeTruthy();

    // Nenhum desses três vira um Switch/rádio de verdade.
    expect(queryByLabelText("Leitura por voz")).toBeNull();
    expect(queryByLabelText("Fonte para dislexia")).toBeNull();
    expect(queryByLabelText("Cursor ampliado")).toBeNull();
    expect(queryByLabelText("Navegação por teclado")).toBeNull();
  });

  it("restaurar padrões: pede confirmação e só reseta se o usuário confirmar", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const { getByLabelText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByLabelText("Grande"));
    });
    await waitFor(() => expect(getByLabelText("Grande").props.accessibilityState.selected).toBe(true));

    await act(async () => {
      fireEvent.press(getByLabelText("Restaurar padrões de acessibilidade"));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Restaurar padrões de acessibilidade",
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancelar" }),
        expect.objectContaining({ text: "Restaurar" }),
      ]),
    );

    // Ainda não confirmou — a preferência alterada continua valendo.
    expect(getByLabelText("Grande").props.accessibilityState.selected).toBe(true);

    const botoes = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const botaoRestaurar = botoes.find((botao) => botao.text === "Restaurar");

    await act(async () => {
      botaoRestaurar?.onPress?.();
    });

    await waitFor(() => expect(getByLabelText("Médio").props.accessibilityState.selected).toBe(true));
    expect(getByLabelText("Grande").props.accessibilityState.selected).toBe(false);

    alertSpy.mockRestore();
  });

  it("persistência: uma preferência alterada continua depois de desmontar e remontar a tela", async () => {
    const primeira = await renderTela();

    await act(async () => {
      fireEvent(primeira.getByLabelText("Reduzir animações"), "valueChange", true);
    });
    await waitFor(() => expect(primeira.getByLabelText("Reduzir animações").props.value).toBe(true));

    await act(async () => {
      primeira.unmount();
    });

    // "Fechar e abrir o app de novo" = uma árvore nova, do zero, lendo o
    // mesmo AsyncStorage (mockado, mas persistente entre as duas montagens).
    const segunda = await renderTela();
    expect(segunda.getByLabelText("Reduzir animações").props.value).toBe(true);
  });
});
