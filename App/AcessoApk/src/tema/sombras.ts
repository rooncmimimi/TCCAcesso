import { Platform, type ViewStyle } from "react-native";

/**
 * Elevação: Android e iOS não compartilham a mesma API de sombra
 * (`elevation` vs. `shadowColor`/`shadowOffset`/`shadowOpacity`/
 * `shadowRadius`), então cada nível define os dois e `shadow()` devolve só
 * o pertinente à plataforma atual via `Platform.select`. O app é
 * Android-first, mas os dois ficam definidos porque o mesmo projeto Expo
 * também roda em iOS sem nenhum custo extra.
 */
const niveis = {
  none: { elevation: 0, opacity: 0, offset: 0, blur: 0 },
  sm: { elevation: 2, opacity: 0.06, offset: 1, blur: 4 },
  md: { elevation: 4, opacity: 0.1, offset: 3, blur: 10 },
  lg: { elevation: 8, opacity: 0.14, offset: 6, blur: 18 },
} as const;

export type NivelElevacao = keyof typeof niveis;

export function sombra(nivel: NivelElevacao, cor: string = "#0F141D"): ViewStyle {
  const valores = niveis[nivel];
  return Platform.select<ViewStyle>({
    android: { elevation: valores.elevation },
    default: {
      shadowColor: cor,
      shadowOffset: { width: 0, height: valores.offset },
      shadowOpacity: valores.opacity,
      shadowRadius: valores.blur,
    },
  })!;
}
