# Design system — decisões não óbvias

- **Marca vs. semântica**: `brand` (4 hex fixos) nunca muda entre temas.
  `colors.primary`/`success`/`warning`/`error`/`info` são tokens separados
  mesmo quando resolvem para o mesmo valor (`primary` e `success` usam o
  mesmo verde): a separação existe pelo significado, não pelo valor.

- **Amarelo**: `#FAD905` nunca leva texto branco. O texto sobre ele usa
  `warning.onSolid`, quase preto (`#050407`, ou preto puro nas paletas de
  alto contraste). O par `solid`/`onSolid` do amarelo é o mesmo nos temas
  claro e escuro, porque já funciona nos dois.

- **Escuro não é claro invertido**: `primary`/`info` ficam mais claros no
  escuro, para manter o contraste contra o fundo escuro, e o texto sobre
  eles vira escuro em vez de branco. O tom sólido de `warning`/`error` é o
  mesmo nos dois temas, porque já tinha contraste suficiente.

- **Alto contraste**: não é um terceiro `ModoTema`, que continua
  `"light" | "dark"`. As paletas `coresClarasAltoContraste` e
  `coresEscurasAltoContraste` (`cores.ts`) são aplicadas por
  `temaAcessivel.ts` sobre o modo ativo; nenhum componente precisou mudar,
  porque todos leem cor por token.

- **Sombra**: Android usa `elevation`; iOS usa `shadow*`. `tema.shadow(nivel)`
  (função `sombra`, em `sombras.ts`) devolve o objeto certo para a
  plataforma atual.

- **Fontes**: Manrope no texto corrido e Plus Jakarta Sans nos títulos, as
  mesmas do Site (`fonteMarca.ts`), e Lexend quando a preferência
  `dyslexiaFont` está ligada (`fonteDislexia.ts`). Enquanto os arquivos
  carregam, vale a fonte padrão da plataforma.
