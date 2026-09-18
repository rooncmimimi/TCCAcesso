import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Pressable, Text } from "react-native";

import { AcessibilidadeProvider } from "../AcessibilidadeProvider";
import { useAcessibilidade } from "../useAcessibilidade";

function Sonda() {
  const { preferencias, definirPreferencia, alternarPreferencia, restaurarPreferencias, sistema, reduzirAnimacoesEfetivo } =
    useAcessibilidade();

  return (
    <>
      <Text testID="highContrast">{String(preferencias.highContrast)}</Text>
      <Text testID="fontScale">{preferencias.fontScale}</Text>
      <Text testID="reduceMotion">{String(preferencias.reduceMotion)}</Text>
      <Text testID="effectiveReduceMotion">{String(reduzirAnimacoesEfetivo)}</Text>
      <Text testID="systemReduceMotion">{String(sistema.reduzirAnimacoesSistema)}</Text>
      <Text testID="systemScreenReader">{String(sistema.leitorDeTelaAtivo)}</Text>
      <Pressable testID="toggleHighContrast" onPress={() => alternarPreferencia("highContrast")}>
        <Text>toggle contraste</Text>
      </Pressable>
      <Pressable testID="setFontScaleLarge" onPress={() => definirPreferencia("fontScale", "large")}>
        <Text>fonte grande</Text>
      </Pressable>
      <Pressable testID="toggleReduceMotion" onPress={() => alternarPreferencia("reduceMotion")}>
        <Text>toggle movimento</Text>
      </Pressable>
      <Pressable testID="reset" onPress={() => restaurarPreferencias()}>
        <Text>redefinir</Text>
      </Pressable>
    </>
  );
}

async function renderComProvider() {
  const utils = await render(
    <AcessibilidadeProvider>
      <Sonda />
    </AcessibilidadeProvider>,
  );
  // O Provider renderiza `null` enquanto lê o AsyncStorage: só depois
  // disso a Sonda (e seus testIDs) existem na árvore.
  await waitFor(() => expect(utils.queryByTestId("highContrast")).toBeTruthy());
  return utils;
}

describe("AcessibilidadeProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it("começa com os valores padrão quando não há nada salvo", async () => {
    const { getByTestId } = await renderComProvider();
    expect(getByTestId("highContrast").props.children).toBe("false");
    expect(getByTestId("fontScale").props.children).toBe("medium");
  });

  it("alternarPreferencia alterna uma preferência booleana e persiste", async () => {
    const { getByTestId } = await renderComProvider();

    await act(async () => {
      fireEvent.press(getByTestId("toggleHighContrast"));
    });

    expect(getByTestId("highContrast").props.children).toBe("true");
    await waitFor(async () => {
      const salvo = await AsyncStorage.getItem("acesso.accessibilityPreferences");
      expect(JSON.parse(salvo ?? "{}").highContrast).toBe(true);
    });
  });

  it("definirPreferencia define um valor específico (não booleano) e persiste", async () => {
    const { getByTestId } = await renderComProvider();

    await act(async () => {
      fireEvent.press(getByTestId("setFontScaleLarge"));
    });

    expect(getByTestId("fontScale").props.children).toBe("large");
    await waitFor(async () => {
      const salvo = await AsyncStorage.getItem("acesso.accessibilityPreferences");
      expect(JSON.parse(salvo ?? "{}").fontScale).toBe("large");
    });
  });

  it("restaurarPreferencias volta tudo para o padrão", async () => {
    const { getByTestId } = await renderComProvider();

    await act(async () => {
      fireEvent.press(getByTestId("toggleHighContrast"));
    });
    expect(getByTestId("highContrast").props.children).toBe("true");

    await act(async () => {
      fireEvent.press(getByTestId("reset"));
    });
    expect(getByTestId("highContrast").props.children).toBe("false");
  });

  it("uma preferência salva numa 'sessão' anterior é lida na próxima (fechar e abrir o app)", async () => {
    const primeira = await renderComProvider();
    await act(async () => {
      fireEvent.press(primeira.getByTestId("toggleReduceMotion"));
    });
    expect(primeira.getByTestId("reduceMotion").props.children).toBe("true");

    // "Reabrir o app" = um Provider novo, do zero, lendo o mesmo
    // AsyncStorage (mockado, mas persistente entre estas duas montagens).
    const segunda = await renderComProvider();
    expect(segunda.getByTestId("reduceMotion").props.children).toBe("true");
  });

  it("detecta o leitor de tela do sistema via AccessibilityInfo", async () => {
    jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(true);

    const { getByTestId } = await renderComProvider();

    await waitFor(() => expect(getByTestId("systemScreenReader").props.children).toBe("true"));
  });

  it("reduzirAnimacoesEfetivo é true quando só o SISTEMA pede redução (mesmo com a preferência do app desligada)", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);

    const { getByTestId } = await renderComProvider();

    await waitFor(() => expect(getByTestId("systemReduceMotion").props.children).toBe("true"));
    expect(getByTestId("reduceMotion").props.children).toBe("false");
    expect(getByTestId("effectiveReduceMotion").props.children).toBe("true");
  });

  it("reduzirAnimacoesEfetivo é true quando só a PREFERÊNCIA do app está ligada (sistema não pede nada)", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);

    const { getByTestId } = await renderComProvider();
    await act(async () => {
      fireEvent.press(getByTestId("toggleReduceMotion"));
    });

    expect(getByTestId("systemReduceMotion").props.children).toBe("false");
    expect(getByTestId("effectiveReduceMotion").props.children).toBe("true");
  });
});
