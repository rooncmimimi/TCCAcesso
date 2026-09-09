/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
// Arquivo SEPARADO de `Button.test.tsx` de propósito: `jest.mock` roda uma
// vez só por arquivo (hoisted), então não dá pra ter `enhancedFocus: false`
// num teste e `enhancedFocus: true` noutro dentro do MESMO arquivo sem
// mockar `useAccessibility` de forma condicional e frágil. Aqui o mock é
// fixo (`enhancedFocus: true` sempre) — `Button.test.tsx` continua cobrindo
// o padrão (`enhancedFocus: false`) sem nenhuma alteração.
jest.mock("../../../accessibility", () => ({
  ...jest.requireActual("../../../accessibility"),
  useAccessibility: () => ({
    preferences: {
      ...jest.requireActual("../../../accessibility").DEFAULT_ACCESSIBILITY_PREFERENCES,
      enhancedFocus: true,
    },
    isLoading: false,
    setPreference: jest.fn(),
    togglePreference: jest.fn(),
    resetPreferences: jest.fn(),
    system: { screenReaderEnabled: false, reduceMotionEnabled: false },
    effectiveReduceMotion: false,
  }),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ThemeProvider } from "../../../theme";
import { Button, type ButtonVariant } from "../Button";

// Não precisa do `AccessibilityProvider` real aqui — `useAccessibility` já
// está totalmente mockado acima (inclusive para o `ThemeProvider`, que o
// consome internamente).
async function renderComFocoAmpliado(ui: React.ReactElement) {
  const utils = await render(<ThemeProvider>{ui}</ThemeProvider>);
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("Button — halo de foco externo com enhancedFocus (Fase 8)", () => {
  it.each<ButtonVariant>(["primary", "destructive", "secondary", "outline", "ghost"])(
    "variante %s: o halo (elemento pai) fica com a cor de foco só enquanto focado",
    async (variant) => {
      const { getByRole } = await renderComFocoAmpliado(<Button variant={variant}>Entrar</Button>);
      const button = getByRole("button", { name: "Entrar" });
      const halo = button.parent;
      expect(halo).toBeTruthy();

      // Antes de focar: reservado, mas transparente.
      const estiloAntes = StyleSheet.flatten(halo!.props.style);
      expect(estiloAntes.borderColor).toBe("transparent");
      expect(estiloAntes.borderWidth).toBe(4); // theme.a11y.focusRingWidth com enhancedFocus

      await act(async () => {
        fireEvent(button, "focus");
      });
      await waitFor(() => {
        const estilo = StyleSheet.flatten(button.parent!.props.style);
        expect(estilo.borderColor).toBe("#0A98E7"); // theme.colors.focus (tema claro)
        expect(estilo.borderWidth).toBe(4); // a ESPESSURA não muda ao focar — só a cor (sem deslocar layout)
      });

      await act(async () => {
        fireEvent(button, "blur");
      });
      await waitFor(() => {
        const estilo = StyleSheet.flatten(button.parent!.props.style);
        expect(estilo.borderColor).toBe("transparent");
      });
    },
  );

  it("a borda INTERNA do botão não muda com o foco quando o halo externo está ativo (evita dois indicadores ao mesmo tempo)", async () => {
    const { getByRole } = await renderComFocoAmpliado(<Button variant="primary">Entrar</Button>);
    const button = getByRole("button", { name: "Entrar" });

    const antes = StyleSheet.flatten(button.props.style);

    await act(async () => {
      fireEvent(button, "focus");
    });

    await waitFor(() => {
      const depois = StyleSheet.flatten(button.props.style);
      expect(depois.borderWidth).toBe(antes.borderWidth);
      expect(depois.borderColor).toBe(antes.borderColor);
    });
  });

  it("o espaço do halo é reservado sempre (mesmo raio/borda focado e desfocado) — o botão não muda de tamanho ao focar", async () => {
    const { getByRole } = await renderComFocoAmpliado(<Button variant="primary">Entrar</Button>);
    const button = getByRole("button", { name: "Entrar" });
    const antes = StyleSheet.flatten(button.parent!.props.style);

    await act(async () => {
      fireEvent(button, "focus");
    });

    await waitFor(() => {
      const depois = StyleSheet.flatten(button.parent!.props.style);
      expect(depois.borderWidth).toBe(antes.borderWidth);
      expect(depois.padding).toBe(antes.padding);
      expect(depois.borderRadius).toBe(antes.borderRadius);
    });
  });
});
