/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockSpeak = jest.fn();

// Fase 21: `AccessibilityScreen` passou a chamar `Speech.speak` diretamente
// no botão "Testar leitura por voz" — mesma técnica de mock simples de
// `SpeechButton.test.tsx`.
jest.mock("expo-speech", () => ({
  speak: (...a: unknown[]) => mockSpeak(...a),
  stop: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
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
  // Fase 21: sem isso, o mock do `AsyncStorage` (persistente por padrão
  // entre `it()`s do MESMO arquivo — só o teste de "persistência" abaixo
  // depende disso, de propósito, dentro de si mesmo) deixaria a preferência
  // `voiceEnabled` ligada por um teste vazar para o próximo, que também a
  // alterna — o segundo teste desligaria em vez de ligar. Limpar entre
  // testes torna cada `it()` independente da ordem, sem mudar o
  // comportamento do teste de persistência (que só depende de si mesmo).
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

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

  it("recursos sem aplicação real (cursor ampliado, navegação por teclado) não têm nenhum controle interativo — só texto informativo", async () => {
    const { queryByLabelText, getByText } = await renderTela();

    expect(getByText("Não se aplica a interfaces por toque.")).toBeTruthy();
    expect(getByText("Suportada automaticamente pelo aplicativo, sem nenhum ajuste necessário.")).toBeTruthy();

    // Nenhum destes dois vira um Switch/rádio de verdade — diferente de
    // "Fonte para dislexia" (Rodada 2) e "Leitura por voz" (Fase 21), que
    // são reais (ver describes abaixo).
    expect(queryByLabelText("Cursor ampliado")).toBeNull();
    expect(queryByLabelText("Navegação por teclado")).toBeNull();
  });

  describe("fonte para dislexia (Rodada 2)", () => {
    it("o switch reflete a preferência e persiste", async () => {
      const { getByLabelText } = await renderTela();

      expect(getByLabelText("Fonte para dislexia").props.value).toBe(false);

      await act(async () => {
        fireEvent(getByLabelText("Fonte para dislexia"), "valueChange", true);
      });

      await waitFor(() => expect(getByLabelText("Fonte para dislexia").props.value).toBe(true));
    });
  });

  describe("leitura por voz (Fase 21)", () => {
    it("o switch começa desativado e o botão de teste não aparece", async () => {
      const { getByLabelText, queryByRole } = await renderTela();

      expect(getByLabelText("Leitura por voz").props.value).toBe(false);
      expect(queryByRole("button", { name: "Testar leitura por voz" })).toBeNull();
    });

    it("ativar o switch persiste a preferência e mostra o botão de teste", async () => {
      const { getByLabelText, findByRole } = await renderTela();

      await act(async () => {
        fireEvent(getByLabelText("Leitura por voz"), "valueChange", true);
      });

      await waitFor(() => expect(getByLabelText("Leitura por voz").props.value).toBe(true));
      expect(await findByRole("button", { name: "Testar leitura por voz" })).toBeTruthy();
    });

    it("'Testar leitura por voz' chama Speech.speak com uma frase de exemplo em pt-BR", async () => {
      const { getByLabelText, findByRole } = await renderTela();

      await act(async () => {
        fireEvent(getByLabelText("Leitura por voz"), "valueChange", true);
      });
      const botaoTestar = await findByRole("button", { name: "Testar leitura por voz" });

      await act(async () => {
        fireEvent.press(botaoTestar);
      });

      expect(mockSpeak).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ language: "pt-BR" }));
    });
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
