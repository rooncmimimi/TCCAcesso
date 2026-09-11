# Acessibilidade — decisões não óbvias (Fase 5)

Cada preferência abaixo, com o que ela **realmente** faz hoje.

| Preferência | Efeito real hoje |
|---|---|
| `themeMode` | Real. Fonte de verdade do tema claro/escuro (`ThemeProvider` lê daqui). |
| `highContrast` | Real. Troca a paleta de cor inteira (ver `theme/colors.ts`, `lightHighContrastColors`/`darkHighContrastColors`). |
| `fontScale` | Real. Escala `fontSize`/`lineHeight` de todos os tokens de tipografia. |
| `letterSpacing` | Real. `wide` usa 0.12× o tamanho da fonte — a referência do WCAG 1.4.12. |
| `lineHeightScale` | Real. Multiplica o `lineHeight` já escalado por `fontScale`. |
| `dyslexiaFont` | **Real (Rodada 2).** Troca `fontFamily` em todos os tokens de tipografia para a Lexend (`@expo-google-fonts/lexend`) quando ativa. Ver `theme/dyslexiaFont.ts` para a justificativa de escolher Lexend em vez de OpenDyslexic, e a seção "`dyslexiaFont` — como funciona" abaixo para detalhes de carregamento/compatibilidade. |
| `largeCursor` | **Preparado, sem efeito — decisão revisitada na Rodada 2, mantida.** Não existe cursor de mouse em uso comum de toque no Android, e a plataforma não expõe uma API para um app comum ampliar o "cursor do sistema". Não fingimos aumentar nada — nem o cursor de texto do `TextInput` (RN não expõe um `cursorWidth`/tamanho de cursor configurável). A reinterpretação mais óbvia — "indicador de foco maior" — já existe como preferência própria e real (`enhancedFocus`, ver linha acima na tela de Configurações → "Foco ampliado"), então `largeCursor` não ganharia nenhum uso novo herdando esse comportamento; manter os dois faria a pessoa achar que são coisas diferentes quando não seriam. A tela de Configurações mostra esta preferência como informação ("Não se aplica a interfaces por toque."), nunca como um controle que parece funcionar sem funcionar. Se um uso real e distinto aparecer no futuro, ele consumiria este flag — hoje nada o lê. |
| `reduceMotion` | Real, mas **sem nada para reduzir ainda**: o app não tem nenhuma animação decorativa hoje (auditado — zero uso de `Animated`/`LayoutAnimation` em `src/`). O valor efetivo (`effectiveReduceMotion` = preferência OU sinal do sistema) já é calculado e exposto em `theme.a11y.reduceMotion` para as próximas fases consultarem antes de adicionar qualquer animação. |
| `enhancedFocus` | Real. Anel de foco mais espesso (`theme.a11y.focusRingWidth`: 2 → 4) e cor dedicada (`theme.colors.focus`) em `Button`/`Input` quando o elemento recebe foco (teclado físico, D-pad, switch access). |
| `keyboardNavigation` | **Preparado, sem efeito controlável.** O foco por teclado físico/D-pad/switch access no Android já funciona sempre, de forma nativa, independente de qualquer flag do app — não existe um "modo de navegação por teclado" para ligar/desligar. O flag existe só para a futura tela de Configurações poder listar a opção de forma consistente com as demais; hoje nenhum código lê o valor dele. |
| `voiceEnabled` | **Real (Fase 21).** `expo-speech` instalado — quando ativo, mostra botões "Ouvir em voz alta" (`components/ui/SpeechButton.tsx`) em vagas e publicações, e um botão "Testar leitura por voz" nesta própria tela. |

## TalkBack × Text-to-Speech × `voiceEnabled`

Três coisas diferentes, fáceis de confundir:

- **TalkBack**: o leitor de tela do próprio Android. Não é código nosso —
  o app só precisa ser *compatível* com ele (`accessibilityLabel`/
  `accessibilityRole`/`accessibilityState` corretos). `system.screenReaderEnabled`
  neste módulo detecta se ele (ou outro leitor de tela) está ativo — nunca o
  liga, desliga, nem o substitui.
- **Text-to-Speech (`expo-speech`)**: implementado na Fase 21 —
  `components/ui/SpeechButton.tsx` lê um trecho de conteúdo inteiro de uma
  vez (ex.: "ouvir esta vaga em voz alta"), usado em `VagaDetailScreen.tsx`
  e `PostagemDetailScreen.tsx`.
- **`voiceEnabled`**: o consentimento/preferência do usuário para essa
  funcionalidade de TTS — não tem nenhuma relação funcional com o TalkBack.
  Decisão de UX tomada na Fase 21: o botão de TTS continua disponível mesmo
  com `system.screenReaderEnabled === true` (nunca escondido) — TalkBack lê
  elemento por elemento conforme o usuário navega, enquanto o TTS lê um
  trecho inteiro de uma vez sem precisar varrer a tela; são funções
  complementares, não a mesma coisa, e usam motores de fala diferentes
  (sem risco de travar um ao outro). Esconder o botão privaria justamente
  quem mais usa tecnologia assistiva de uma leitura contínua.

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

## `dyslexiaFont` — como funciona (Rodada 2)

Implementado de verdade (não é mais um flag "preparado, sem efeito"):

- **Fonte escolhida: Lexend, não OpenDyslexic.** A justificativa completa
  está como comentário em `theme/dyslexiaFont.ts` (é a decisão mais
  discutível desta mudança, por isso registrada perto do código, não só
  aqui): resumindo, a evidência de leitura a favor da OpenDyslexic é fraca
  e não resistiu bem a réplicas, e seu desenho incomum incomoda parte de
  quem tenta usá-la; a Lexend tem estudos de leitura com amostra maior
  mostrando ganho de velocidade de leitura, parece uma sans-serif comum
  (não "marcada" como fonte de acessibilidade) e é mantida ativamente no
  Google Fonts.
- **Dependência nova:** `@expo-google-fonts/lexend` (mais `expo-font`,
  que já vinha como dependência transitiva do SDK do Expo — passou a
  dependência direta porque agora é importado diretamente em
  `theme/ThemeProvider.tsx`). Só os 5 pesos que `theme/typography.ts`
  usa (400/500/600/700/800) são importados, cada um do seu SUBCAMINHO
  próprio (`@expo-google-fonts/lexend/400Regular`, etc. — ver
  `theme/dyslexiaFont.ts`), não do pacote inteiro — importar do pacote
  inteiro empacotaria os 9 pesos da família (confirmado experimentalmente
  com `npx expo export --platform android`: a lista de assets exportados
  mudou de 9 arquivos `.ttf` da Lexend para 5 ao trocar para os
  subcaminhos). Custo real de tamanho, medido no mesmo `expo export`:
  ~78-79KB por peso, ~394KB no total dos 5 arquivos usados.
- **Onde é aplicada:** um único lugar, `theme/accessibleTheme.ts`
  (`scaleTypography`) — o mesmo ponto que já aplica `fontScale`/
  `letterSpacing`/`lineHeightScale`. Nenhum componente de tela precisou
  mudar, pelo mesmo motivo de sempre: todos leem `theme.typography.*`,
  nunca um `fontSize`/fonte solta.
- **Carregamento:** `theme/ThemeProvider.tsx` chama `useFonts()`
  (`expo-font`) sempre, não só quando a preferência está ligada — os
  arquivos são locais (empacotados no app), então carregar de antemão não
  tem custo de rede, e a regra dos hooks do React não permite chamar
  `useFonts` condicionalmente de qualquer forma. Enquanto a fonte ainda
  não carregou (só os primeiríssimos instantes depois de abrir o app —
  tipicamente antes de qualquer tela aparecer), `dyslexiaFont` fica sem
  efeito temporariamente em vez de aplicar um `fontFamily` que ainda não
  existe; assim que carrega, o React já re-renderiza com a fonte certa,
  sem precisar fechar/abrir o app de novo.
- **Peso por variante, não um `fontFamily` fixo:** ao contrário da Roboto
  (fonte padrão do Android, que o próprio sistema sintetiza em qualquer
  `fontWeight`), uma fonte carregada via `expo-font` só respeita o peso
  exato do arquivo carregado — por isso `theme/dyslexiaFont.ts` mapeia
  cada `fontWeight` usado em `typography.ts` (400/500/600/700/800) para o
  nome de fonte certo, aplicado token por token.
- **Compatibilidade com as outras preferências de texto:** `fontFamily` é
  só mais um campo do mesmo objeto de estilo que já recebe `fontSize`/
  `lineHeight`/`letterSpacing` escalados — os quatro convivem sem conflito
  porque cada um é uma propriedade CSS/RN independente, nenhuma sobrescreve
  a outra. `highContrast` também não conflita: troca só a paleta de cor
  (`theme.colors`), nunca toca em tipografia.
- **Risco de quebrar layout:** avaliado como baixo. `typography.ts` já usa
  `lineHeight` generoso de propósito ("nunca altura fixa de container",
  ver o comentário lá) justamente para textos maiores não cortarem — a
  mesma folga cobre a troca de fonte. Não foi possível confirmar
  visualmente em dispositivo real (ver limitação de ambiente no relatório
  da Rodada 2); a verificação foi por leitura de código,
  `npx tsc --noEmit`, os testes automatizados (`accessibleTheme.test.ts`,
  `AccessibilityScreen.test.tsx`) e `npx expo export --platform android`
  (confirma que os arquivos de fonte são resolvidos e empacotados de
  verdade, não só que o TypeScript aceita os tipos).
