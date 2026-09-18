// Cada peso vem do próprio subcaminho, e não da raiz de `@expo-google-fonts/lexend`, como recomenda
// o README do pacote: o `index.js` da raiz faz `require()` dos 9 arquivos `.ttf`, e o Metro
// empacotaria todos mesmo usando só 5. Com `npx expo export --platform android`, a lista de assets
// caiu de 9 para 5 pesos.
import { Lexend_400Regular } from "@expo-google-fonts/lexend/400Regular";
import { Lexend_500Medium } from "@expo-google-fonts/lexend/500Medium";
import { Lexend_600SemiBold } from "@expo-google-fonts/lexend/600SemiBold";
import { Lexend_700Bold } from "@expo-google-fonts/lexend/700Bold";
import { Lexend_800ExtraBold } from "@expo-google-fonts/lexend/800ExtraBold";

/**
 * Fonte da preferência `dyslexiaFont`: Lexend, e não OpenDyslexic. A evidência de que a
 * OpenDyslexic ajuda na leitura é fraca (estudos pequenos, que não se confirmaram em réplicas), e o
 * desenho carregado das letras incomoda parte de quem a usa. A Lexend tem estudos com amostras
 * maiores mostrando leitura mais rápida, parece uma sans-serif comum e segue mantida no Google
 * Fonts.
 *
 * Só os 5 pesos usados em `tema/tipografia.ts` (400 a 800) são carregados, cerca de 394 KB no
 * total, pelo `useFonts` do `TemaProvider`. Uma fonte carregada assim só tem o peso exato de cada
 * arquivo (o Android não sintetiza o negrito como faz com a Roboto), por isso o mapa abaixo liga
 * cada `fontWeight` ao arquivo certo, usado por `tema/temaAcessivel.ts`.
 */
export const ARQUIVOS_FONTE_DISLEXIA = {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  Lexend_800ExtraBold,
};

export type FamiliaFonteDislexia = keyof typeof ARQUIVOS_FONTE_DISLEXIA;

/** `fontWeight` (em string, como em `tipografia.ts`) → nome da fonte carregada para esse peso. */
export const FAMILIA_FONTE_DISLEXIA_POR_PESO: Record<string, FamiliaFonteDislexia> = {
  "400": "Lexend_400Regular",
  "500": "Lexend_500Medium",
  "600": "Lexend_600SemiBold",
  "700": "Lexend_700Bold",
  "800": "Lexend_800ExtraBold",
};
