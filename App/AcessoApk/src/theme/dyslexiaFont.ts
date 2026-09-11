// Importado peso por peso, do SUBCAMINHO de cada peso (não do pacote
// inteiro, `@expo-google-fonts/lexend`) — é a forma que o próprio README do
// pacote recomenda para não empacotar os 9 pesos da família (o `index.js`
// da raiz do pacote tem um `require()` de cada um dos 9 arquivos .ttf; como
// são efeitos colaterais de módulo, importar dali faria o Metro empacotar
// os 9, mesmo usando só 5 named exports). Confirmado com
// `npx expo export --platform android`: antes desta troca, os 9 pesos
// apareciam na lista de assets exportados; depois, só os 5 usados.
import { Lexend_400Regular } from "@expo-google-fonts/lexend/400Regular";
import { Lexend_500Medium } from "@expo-google-fonts/lexend/500Medium";
import { Lexend_600SemiBold } from "@expo-google-fonts/lexend/600SemiBold";
import { Lexend_700Bold } from "@expo-google-fonts/lexend/700Bold";
import { Lexend_800ExtraBold } from "@expo-google-fonts/lexend/800ExtraBold";

/**
 * Fonte usada pela preferência `dyslexiaFont` (Fase R6/Rodada 2 do
 * relatório de acessibilidade) — decisão registrada aqui, não só no
 * relatório, porque é o tipo de escolha que alguém pode querer revisitar
 * lendo só o código:
 *
 * Lexend, não OpenDyslexic. A OpenDyslexic é a escolha "óbvia" (o nome
 * já sugere o propósito), mas a evidência de que ela de fato ajuda pessoas
 * disléxicas a ler mais rápido/com menos erro é fraca — os estudos mais
 * citados a favor dela têm amostras pequenas e não resistiram bem a
 * réplicas, e o desenho bem particular das letras (muito espessas na base)
 * incomoda visualmente parte de quem tenta usá-la, disléxico ou não. A
 * Lexend, ao contrário, tem estudos de leitura com amostras maiores
 * (inclusive um em parceria com a Understood.org/Google Fonts) mostrando
 * ganho mensurável de velocidade de leitura para o público em geral — não
 * é uma fonte "especial" com aparência incomum, é uma sans-serif comum
 * desenhada com métricas (espaçamento, altura de x, largura de traço)
 * otimizadas para reduzir esforço de leitura. Continua ativamente mantida
 * no Google Fonts.
 *
 * Só os 5 pesos que `theme/typography.ts` de fato usa (400/500/600/700/800)
 * são carregados — não a família inteira (9 pesos), o que economiza espaço
 * no pacote do app. Cada peso é um arquivo estático separado de ~78-79KB
 * (medido no `Assets` listado por `npx expo export --platform android`),
 * ~394KB no total dos 5 — carregado uma única vez via `expo-font`
 * (`useFonts`, chamado em `ThemeProvider.tsx`) — ao contrário da fonte
 * padrão do Android (Roboto), que o próprio sistema sintetiza em qualquer
 * `fontWeight`, uma fonte carregada assim só respeita o peso EXATO do
 * arquivo — `fontWeight` sozinho não escolhe automaticamente entre
 * Regular/Bold/etc. Por isso o mapeamento peso→nome de fonte abaixo:
 * `theme/accessibleTheme.ts` usa este mapa para escolher o `fontFamily`
 * certo por token de tipografia, nunca um valor fixo único.
 */
export const DYSLEXIA_FONT_ASSETS = {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  Lexend_800ExtraBold,
};

export type DyslexiaFontFamily = keyof typeof DYSLEXIA_FONT_ASSETS;

/** Peso (`fontWeight`, como string — é assim que `typography.ts` declara) → nome da fonte carregada para esse peso. */
export const DYSLEXIA_FONT_FAMILY_BY_WEIGHT: Record<string, DyslexiaFontFamily> = {
  "400": "Lexend_400Regular",
  "500": "Lexend_500Medium",
  "600": "Lexend_600SemiBold",
  "700": "Lexend_700Bold",
  "800": "Lexend_800ExtraBold",
};
