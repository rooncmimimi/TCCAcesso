# Design system — decisões não óbvias

- **Marca vs. semântica**: `brand` (4 hex fixos) nunca muda entre temas.
  `colors.primary`/`success`/`warning`/`error`/`info` são tokens separados
  mesmo quando resolvem para o mesmo valor hoje (`primary` e `success` são
  o mesmo verde) — a separação existe para o significado, não para o valor.

- **Amarelo**: `#FAD905` nunca leva texto branco nem preto puro. Sempre usa
  `warning.onSolid`/`warning.onSoft` (quase preto, `#050407`), nos dois
  temas — é o único par de cores que não muda entre claro/escuro, porque já
  funciona nos dois.

- **Escuro não é claro invertido**: `primary`/`info` ficam mais claros no
  escuro (senão perderiam contraste contra um fundo escuro) e o texto sobre
  eles vira escuro em vez de branco. `warning`/`error` ficam iguais nos dois
  temas de propósito — já tinham contraste suficiente nos dois.

- **Alto contraste**: não implementado nesta fase. `ThemeMode` é só
  `"light" | "dark"` — um terceiro modo entra depois sem exigir mudança em
  nenhum componente, porque todos leem cor por token.

- **Sombra**: Android usa `elevation`; iOS usa `shadow*`. `shadow(nível)`
  devolve o objeto certo pra plataforma atual.

- **Fonte**: usa a fonte padrão da plataforma (Roboto no Android) por
  enquanto. Carregar as fontes de marca do site (Plus Jakarta Sans/Manrope)
  ficou pendente — ver relatório da Fase 2.
