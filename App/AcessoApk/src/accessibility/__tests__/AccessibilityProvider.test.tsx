import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Pressable, Text } from "react-native";

import { AccessibilityProvider } from "../AccessibilityProvider";
import { useAccessibility } from "../useAccessibility";

function Sonda() {
  const { preferences, setPreference, togglePreference, resetPreferences, system, effectiveReduceMotion } =
    useAccessibility();

  return (
    <>
      <Text testID="highContrast">{String(preferences.highContrast)}</Text>
      <Text testID="fontScale">{preferences.fontScale}</Text>
      <Text testID="reduceMotion">{String(preferences.reduceMotion)}</Text>
      <Text testID="effectiveReduceMotion">{String(effectiveReduceMotion)}</Text>
      <Text testID="systemReduceMotion">{String(system.reduceMotionEnabled)}</Text>
      <Text testID="systemScreenReader">{String(system.screenReaderEnabled)}</Text>
      <Pressable testID="toggleHighContrast" onPress={() => togglePreference("highContrast")}>
        <Text>toggle contraste</Text>
      </Pressable>
      <Pressable testID="setFontScaleLarge" onPress={() => setPreference("fontScale", "large")}>
        <Text>fonte grande</Text>
      </Pressable>
      <Pressable testID="toggleReduceMotion" onPress={() => togglePreference("reduceMotion")}>
        <Text>toggle movimento</Text>
      </Pressable>
      <Pressable testID="reset" onPress={() => resetPreferences()}>
        <Text>redefinir</Text>
      </Pressable>
    </>
  );
}

async function renderProvider() {
  const utils = await render(
    <AccessibilityProvider>
      <Sonda />
    </AccessibilityProvider>,
  );
  // O Provider renderiza `null` enquanto lê o AsyncStorage — só depois
  // disso a Sonda (e seus testIDs) existem na árvore.
  await waitFor(() => expect(utils.queryByTestId("highContrast")).toBeTruthy());
  return utils;
}

describe("AccessibilityProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it("começa com os valores padrão quando não há nada salvo", async () => {
    const { getByTestId } = await renderProvider();
    expect(getByTestId("highContrast").props.children).toBe("false");
    expect(getByTestId("fontScale").props.children).toBe("medium");
  });

  it("togglePreference alterna uma preferência booleana e persiste", async () => {
    const { getByTestId } = await renderProvider();

    await act(async () => {
      fireEvent.press(getByTestId("toggleHighContrast"));
    });

    expect(getByTestId("highContrast").props.children).toBe("true");
    await waitFor(async () => {
      const salvo = await AsyncStorage.getItem("acesso.accessibilityPreferences");
      expect(JSON.parse(salvo ?? "{}").highContrast).toBe(true);
    });
  });

  it("setPreference define um valor específico (não booleano) e persiste", async () => {
    const { getByTestId } = await renderProvider();

    await act(async () => {
      fireEvent.press(getByTestId("setFontScaleLarge"));
    });

    expect(getByTestId("fontScale").props.children).toBe("large");
    await waitFor(async () => {
      const salvo = await AsyncStorage.getItem("acesso.accessibilityPreferences");
      expect(JSON.parse(salvo ?? "{}").fontScale).toBe("large");
    });
  });

  it("resetPreferences volta tudo para o padrão", async () => {
    const { getByTestId } = await renderProvider();

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
    const primeira = await renderProvider();
    await act(async () => {
      fireEvent.press(primeira.getByTestId("toggleReduceMotion"));
    });
    expect(primeira.getByTestId("reduceMotion").props.children).toBe("true");

    // "Reabrir o app" = um Provider novo, do zero, lendo o mesmo
    // AsyncStorage (mockado, mas persistente entre estas duas montagens).
    const segunda = await renderProvider();
    expect(segunda.getByTestId("reduceMotion").props.children).toBe("true");
  });

  it("detecta o leitor de tela do sistema via AccessibilityInfo", async () => {
    jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(true);

    const { getByTestId } = await renderProvider();

    await waitFor(() => expect(getByTestId("systemScreenReader").props.children).toBe("true"));
  });

  it("effectiveReduceMotion é true quando só o SISTEMA pede redução (mesmo com a preferência do app desligada)", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);

    const { getByTestId } = await renderProvider();

    await waitFor(() => expect(getByTestId("systemReduceMotion").props.children).toBe("true"));
    expect(getByTestId("reduceMotion").props.children).toBe("false");
    expect(getByTestId("effectiveReduceMotion").props.children).toBe("true");
  });

  it("effectiveReduceMotion é true quando só a PREFERÊNCIA do app está ligada (sistema não pede nada)", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);

    const { getByTestId } = await renderProvider();
    await act(async () => {
      fireEvent.press(getByTestId("toggleReduceMotion"));
    });

    expect(getByTestId("systemReduceMotion").props.children).toBe("false");
    expect(getByTestId("effectiveReduceMotion").props.children).toBe("true");
  });
});
