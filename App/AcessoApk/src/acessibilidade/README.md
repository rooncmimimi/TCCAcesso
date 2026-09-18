# Acessibilidade — decisões não óbvias

Cada preferência, com o que ela **realmente** faz hoje.

| Preferência | Efeito |
|---|---|
| `themeMode` | Tema claro, escuro ou igual ao do sistema. O `TemaProvider` lê daqui. |
| `highContrast` | Troca a paleta de cores inteira (ver `tema/cores.ts`, `coresClarasAltoContraste`/`coresEscurasAltoContraste`). |
| `fontScale` | Escala `fontSize`/`lineHeight` de todos os tokens de tipografia. |
| `letterSpacing` | `wide` usa 0,12× o tamanho da fonte, a referência do WCAG 1.4.12. |
| `lineHeightScale` | Multiplica o `lineHeight` já escalado por `fontScale`. |
| `dyslexiaFont` | Troca a `fontFamily` de todos os tokens de tipografia pela Lexend (`@expo-google-fonts/lexend`). Ver `tema/fonteDislexia.ts` e a seção "`dyslexiaFont`" abaixo. |
| `largeCursor` | **Sem efeito.** Telas de toque não têm cursor, o Android não deixa um app comum ampliar o "cursor do sistema", e o `TextInput` não expõe o tamanho do cursor de texto. A leitura mais próxima, "indicador de foco maior", já existe como `enhancedFocus`, então esta preferência não teria um uso próprio. A tela de Acessibilidade mostra "Não se aplica a interfaces por toque." em vez de um controle, e nada lê o valor. |
| `reduceMotion` | O valor efetivo (`reduzirAnimacoesEfetivo`: preferência OU ajuste do sistema) fica em `tema.a11y.reduceMotion`. O app ainda não tem animações decorativas (`Animated`/`LayoutAnimation`) para reduzir; qualquer animação nova deve consultar esse valor. |
| `enhancedFocus` | Anel de foco mais espesso (`tema.a11y.focusRingWidth`: 2 → 4) na cor `tema.colors.focus` em `Botao`, `CampoTexto` e `ControleSegmentado`; no `Botao`, o foco vira um halo por fora. |
| `keyboardNavigation` | **Sem efeito.** O foco por teclado físico, D-pad e acesso por botão já funciona sempre no Android; não existe um "modo de navegação por teclado" para ligar ou desligar. A tela mostra isso como informação, e nada lê o valor. |
| `voiceEnabled` | Mostra os botões "Ouvir em voz alta" (`components/ui/BotaoOuvir.tsx`) no detalhe de vagas e de publicações e na Ajuda, e o botão "Testar leitura por voz" na tela de Acessibilidade. |

## TalkBack, leitura em voz alta e `voiceEnabled`

Três coisas diferentes, fáceis de confundir:

- **TalkBack**: o leitor de tela do Android. Não é código do app; o app só
  precisa ser *compatível* com ele (`accessibilityLabel`,
  `accessibilityRole` e `accessibilityState` corretos).
  `sistema.leitorDeTelaAtivo` detecta se ele (ou outro leitor de tela) está
  ativo, sem ligar, desligar ou substituir nada.
- **Leitura em voz alta (`expo-speech`)**: `components/ui/BotaoOuvir.tsx`
  lê um trecho inteiro de uma vez (por exemplo, "ouvir esta vaga").
- **`voiceEnabled`**: o consentimento para essa leitura em voz alta, sem
  relação com o TalkBack. O botão continua disponível mesmo com
  `sistema.leitorDeTelaAtivo === true`: o TalkBack lê elemento por elemento
  conforme a navegação, enquanto o botão lê o trecho inteiro sem varrer a
  tela. Os motores de fala são diferentes (um não trava o outro), e
  esconder o botão tiraria a leitura contínua justamente de quem mais usa
  tecnologia assistiva.

## Leitor de tela não é uma preferência

Não existe `preferencias.screenReader`. O TalkBack é ativado nas
configurações do Android, e uma preferência no app sugeriria, falsamente,
que o ACESSO consegue ligá-lo ou desligá-lo. O estado real, só leitura,
fica em `sistema.leitorDeTelaAtivo`.

## Alto contraste não é um terceiro `ModoTema`

`highContrast` é independente de `themeMode`: dá para ter alto contraste com
tema claro ou com tema escuro, do mesmo jeito que o Android trata o
"contraste alto" (um ajuste sobre o tema ativo). `tema/temaAcessivel.ts`
escolhe entre 4 paletas (claro, escuro, claro com alto contraste e escuro
com alto contraste).

## `dyslexiaFont`

- **Fonte: Lexend, e não OpenDyslexic.** A justificativa completa está em
  `tema/fonteDislexia.ts`, perto do código. Em resumo: a evidência de que a
  OpenDyslexic ajuda na leitura é fraca e não se confirmou em réplicas, e o
  desenho dela incomoda parte de quem a usa; a Lexend tem estudos com
  amostras maiores mostrando leitura mais rápida, parece uma sans-serif
  comum e é mantida no Google Fonts.
- **Dependências:** `@expo-google-fonts/lexend` e `expo-font` (importado
  direto em `tema/TemaProvider.tsx`). Só os 5 pesos usados por
  `tema/tipografia.ts` (400/500/600/700/800) são importados, cada um do seu
  subcaminho (`@expo-google-fonts/lexend/400Regular` etc.). Importar da raiz
  do pacote empacotaria os 9 pesos: com `npx expo export --platform android`,
  a lista de assets caiu de 9 para 5 arquivos `.ttf` da Lexend ao trocar
  para os subcaminhos. Cada peso tem cerca de 78 a 79 KB (uns 394 KB no
  total).
- **Onde é aplicada:** num único lugar, `tema/temaAcessivel.ts`
  (`escalarTipografia`), o mesmo que aplica `fontScale`, `letterSpacing` e
  `lineHeightScale`. Nenhuma tela precisou mudar, porque todas leem
  `tema.typography.*`, nunca um `fontSize` ou fonte soltos.
- **Carregamento:** `tema/TemaProvider.tsx` chama `useFonts()` sempre, e não
  só com a preferência ligada: os arquivos são locais, sem custo de rede, e
  a regra dos hooks não permite chamar `useFonts` condicionalmente. Enquanto
  a fonte não carrega (primeiros instantes do app), `dyslexiaFont` fica sem
  efeito em vez de aplicar uma `fontFamily` que ainda não existe; quando
  carrega, o React renderiza de novo com a fonte certa, sem reiniciar o app.
- **Peso por variante:** diferente da Roboto, que o Android sintetiza em
  qualquer `fontWeight`, uma fonte carregada pelo `expo-font` só tem o peso
  exato de cada arquivo. Por isso `tema/fonteDislexia.ts` mapeia cada
  `fontWeight` de `tema/tipografia.ts` para o arquivo certo, token por
  token.
- **Convivência com as outras preferências de texto:** `fontFamily` é só
  mais um campo do objeto de estilo que recebe `fontSize`, `lineHeight` e
  `letterSpacing` escalados, e nenhum sobrescreve o outro. `highContrast`
  também não conflita: troca só `tema.colors`, nunca a tipografia.
- **Risco de quebrar layout:** baixo. `tema/tipografia.ts` já usa
  `lineHeight` generoso para textos maiores não serem cortados, e a mesma
  folga cobre a troca de fonte. Não foi conferido em aparelho real; a
  verificação foi por leitura de código, `npx tsc --noEmit`, pelos testes
  (`temaAcessivel.test.ts`, `AcessibilidadeScreen.test.tsx`) e por
  `npx expo export --platform android`, que confirma que os arquivos de fonte
  são resolvidos e empacotados.
