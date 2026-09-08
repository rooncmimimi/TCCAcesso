# Acessibilidade — decisões não óbvias (Fase 5)

Cada preferência abaixo, com o que ela **realmente** faz hoje.

| Preferência | Efeito real hoje |
|---|---|
| `themeMode` | Real. Fonte de verdade do tema claro/escuro (`ThemeProvider` lê daqui). |
| `highContrast` | Real. Troca a paleta de cor inteira (ver `theme/colors.ts`, `lightHighContrastColors`/`darkHighContrastColors`). |
| `fontScale` | Real. Escala `fontSize`/`lineHeight` de todos os tokens de tipografia. |
| `letterSpacing` | Real. `wide` usa 0.12× o tamanho da fonte — a referência do WCAG 1.4.12. |
| `lineHeightScale` | Real. Multiplica o `lineHeight` já escalado por `fontScale`. |
| `dyslexiaFont` | **Preparado, sem efeito.** Não há nenhuma fonte para dislexia empacotada no app (nada de arquivo baixado de terceiros sem necessidade real). O flag existe e persiste; quando uma fonte adequada for adicionada ao projeto, basta `theme/accessibleTheme.ts` passar a trocar `fontFamily` quando `dyslexiaFont === true` — nenhum componente precisa mudar. |
| `largeCursor` | **Preparado, sem efeito.** Não existe cursor de mouse em uso comum de toque no Android, e a plataforma não expõe uma API para um app comum ampliar o "cursor do sistema". Não fingimos aumentar nada — nem o cursor de texto do `TextInput` (RN não expõe um `cursorWidth`/tamanho de cursor configurável). Se um uso real aparecer no futuro (ex.: um indicador visual customizado de algum componente específico), ele consumiria este flag — hoje nada o lê. |
| `reduceMotion` | Real, mas **sem nada para reduzir ainda**: o app não tem nenhuma animação decorativa hoje (auditado — zero uso de `Animated`/`LayoutAnimation` em `src/`). O valor efetivo (`effectiveReduceMotion` = preferência OU sinal do sistema) já é calculado e exposto em `theme.a11y.reduceMotion` para as próximas fases consultarem antes de adicionar qualquer animação. |
| `enhancedFocus` | Real. Anel de foco mais espesso (`theme.a11y.focusRingWidth`: 2 → 4) e cor dedicada (`theme.colors.focus`) em `Button`/`Input` quando o elemento recebe foco (teclado físico, D-pad, switch access). |
| `keyboardNavigation` | **Preparado, sem efeito controlável.** O foco por teclado físico/D-pad/switch access no Android já funciona sempre, de forma nativa, independente de qualquer flag do app — não existe um "modo de navegação por teclado" para ligar/desligar. O flag existe só para a futura tela de Configurações poder listar a opção de forma consistente com as demais; hoje nenhum código lê o valor dele. |
| `voiceEnabled` | **Preparado, sem efeito.** Nenhum `expo-speech` foi instalado nesta fase (fora do escopo — "não reescreva o sistema de voz da Fase 3" presumia uma implementação que a auditoria desta fase não encontrou em nenhum lugar do app mobile; ver relatório final, seção 8). O flag existe para quando essa integração for decidida. |

## TalkBack × Text-to-Speech × `voiceEnabled`

Três coisas diferentes, fáceis de confundir:

- **TalkBack**: o leitor de tela do próprio Android. Não é código nosso —
  o app só precisa ser *compatível* com ele (`accessibilityLabel`/
  `accessibilityRole`/`accessibilityState` corretos). `system.screenReaderEnabled`
  neste módulo detecta se ele (ou outro leitor de tela) está ativo — nunca o
  liga, desliga, nem o substitui.
- **Text-to-Speech (`expo-speech`)**: uma funcionalidade que o PRÓPRIO
  ACESSO ofereceria (ex.: "ouvir esta vaga em voz alta") — não instalada
  nesta fase, sem nenhuma integração ainda.
- **`voiceEnabled`**: o consentimento/preferência do usuário para essa
  futura funcionalidade de TTS — não tem nenhuma relação funcional com o
  TalkBack. Nunca devem ser tratados como a mesma coisa: se um dia o TTS for
  implementado, ele precisa evitar tocar por cima do que o TalkBack já está
  narrando (ex.: não iniciar fala própria quando `system.screenReaderEnabled`
  for `true`), para não duplicar áudio — mas isso é uma decisão de UX da
  fase que implementar o TTS de verdade, não desta.

## `screenReader` não é uma preferência

De propósito, não existe `preferences.screenReader`. TalkBack é ativado nas
configurações do Android, não dentro do ACESSO — expor isso como se fosse
uma preferência do app sugeriria (falsamente) que o app consegue ligar/
desligar o TalkBack. O estado real e só-leitura mora em
`system.screenReaderEnabled`.

## Alto contraste não é um terceiro `ThemeMode`

`highContrast` é uma preferência própria, ortogonal a `themeMode` — dá para
ter alto contraste + claro OU alto contraste + escuro (o Android trata
"contraste alto" como um ajuste sobre o tema ativo, não como um tema à
parte). `theme/accessibleTheme.ts` escolhe entre 4 paletas
(`light`/`dark`/`lightHighContrast`/`darkHighContrast`), nunca 3.
