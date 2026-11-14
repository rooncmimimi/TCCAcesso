# Personalização visual e daltonismo (14/11/2026)

O que foi feito, como funciona e — principalmente — o que **não** foi feito.

## 1. A auditoria contrariou a premissa: metade já existia

Antes de escrever qualquer coisa, li o projeto. O `AcessibilidadeProvider` já tinha rascunho com
pré-visualização em tempo real, `salvar`, `descartar` e `restaurar`; já existiam cores à escolha e um
interruptor de "modo para daltonismo"; e `lib/contraste.ts` já media WCAG ao vivo. Não era um sistema
a construir, era um sistema a estender.

Três achados que mudaram o escopo:

1. **`--success` reprovava no contraste.** O verde vivo da marca (`#21a848`) mede **3,11:1** com
   texto branco, abaixo dos 4,5:1 do WCAG 1.4.3. O modo escuro nem o redefinia. `--info` não existia,
   e `--success`/`--warning` eram usados em dois arquivos.
2. **O Site tem seis tags `<img>` e um SVG**, decorativo. Não existem infográficos, diagramas nem
   ilustrações informativas: o que existe é foto, capa, logotipo e anexo — o que não se deve mexer.
3. **Não havia filtro de cor nenhum** no projeto. Ninguém tinha tomado o atalho.

## 2. Como funciona

```
preferência → AcessibilidadeProvider → variáveis no <html> → globals.css → Tailwind → 62 rotas
```

As cores do padrão vão como **variáveis inline na raiz**, então vencem qualquer bloco do CSS,
inclusive o de alto contraste. É de propósito: toda paleta passa de 4,5:1 com o seu texto, e quem
escolheu um padrão escolheu para usar. O alto contraste continua mandando no fundo, no texto e nas
bordas, que o padrão não toca.

## 3. Os padrões

| Padrão | O que muda, e por quê |
|---|---|
| **Cores do ACESSO** | nada: a marca como é |
| **Padrão acessível** | azul e laranja no lugar de verde e vermelho (Okabe-Ito) |
| **Protanopia** | erro vira **magenta**: o vermelho, além de confundir com o verde, aparece bem mais escuro |
| **Deuteranopia** | erro fica laranja (ali o vermelho mantém a claridade) e o alerta vira âmbar |
| **Tritanopia** | verde e vermelho voltam a servir; quem sai é o amarelo, que vira magenta |
| **Monocromático** | os quatro estados usam **o mesmo tom**, de propósito |

Três decisões que valem discussão:

- **o verde da marca só muda no monocromático.** Trocar a cor que carrega informação é recomendação
  do Color Universal Design; trocar a identidade visual não é;
- **no monocromático os quatro estados são iguais.** Fingir que a cor distingue seria pior do que
  assumir que não distingue. Quem separa é o ícone e o texto;
- **o amarelo saiu do tema claro.** Mede 1,3:1 contra a página branca — a borda do selo some. Virou
  âmbar `#a65f00`, que mede 4,9:1 nas duas contas.

## 4. A personalização individual

Em cima do padrão: **intensidade**, **saturação**, **brilho**, **contraste mínimo do texto**
(4,5 / 7 / 10) e a **cor de cada significado** (destaque, sucesso, erro, alerta, informação).

O que deixa os controles serem livres é `lib/cor.ts`: a conta em OKLCH, onde claridade, cor e matiz
são coordenadas separadas. `parLegivel` aplica o ajuste, **escolhe sozinho** se o texto em cima fica
claro ou escuro e **empurra a claridade até bater o contraste mínimo**. Por isso nenhum ajuste, por
mais extremo, produz texto ilegível — e há teste para isso, com seis combinações extremas contra sete
cores.

Intensidade, saturação e brilho são **preferência visual**. Não corrigem a visão de ninguém nem
reproduzem como outra pessoa enxerga, e a tela diz isso.

## 5. A amostra

No topo da seção, os **componentes de verdade** do ACESSO: selos de status, os quatro avisos, os três
botões, um campo com erro e uma notificação. Não há fio ligando a amostra aos controles — ela lê as
mesmas variáveis que o resto do site. O que se vê é o que a tela vai fazer.

Os avisos da amostra usam `role="note"` e não `role="alert"`: quatro regiões ao vivo numa página de
configurações seriam quatro anúncios a cada troca de padrão.

## 6. Os gráficos

Três coisas, nenhuma delas cor:

1. **hachura** por série (sólida, diagonal, pontos, cruzada, horizontal) — é o que sustenta o
   monocromático e o que salva qualquer gráfico impresso em preto e branco;
2. **número escrito** em cada barra e fatia;
3. **tabela** com os mesmos números, a um clique, com total e legenda.

Mais: os padrões mandam em `--chart-1` a `--chart-5`, o gráfico se anuncia com `role="img"` e um
rótulo que **já traz os números**, e a legenda passou a mostrar o status traduzido — antes saía a
chave crua (`em_analise`).

Duas coisas que só apareceram no navegador: o recharts **descarta** um componente que não conhece
(o `<defs>` sumia), e uma `<pattern>` num `<svg>` ao lado **não pinta** — tem de estar no mesmo
`<svg>` que a usa.

## 7. As imagens

A etapa mais curta, de propósito, porque a auditoria mostrou que quase não há imagem informativa
aqui. No lightbox, um seletor: Original, Com mais cor, Sem cor nenhuma, e as três simulações.

- **nunca automático.** Foto de gente, logotipo e capa continuam como são;
- **nunca toca no arquivo.** É `filter: url(#...)`, filtro de pintura do navegador. Nada é reenviado,
  e "Original" volta num clique. Funciona em imagem de outro domínio, porque não lê pixel — CORS nem
  entra;
- **não corrige a visão de ninguém.** As simulações usam as matrizes de Viénot, Brettel e Mollon, e
  servem para quem **publica** conferir a própria imagem. São aproximações, e a tela diz isso.

Daltonização de verdade exige simular, medir o erro e redistribuí-lo. Uma matriz errada com o rótulo
de "corrigido" seria pior do que não ter o recurso.

## 8. A preferência na conta

Migration **0014**: uma coluna `visual jsonb`. Sete coisas hoje e o conjunto vai crescer; cada ajuste
como coluna própria seria uma migration nova. Nulo quer dizer "nunca personalizou", diferente de ter
escolhido "nenhum".

`utils/visualDaConta.js` é a última porta antes do banco, e o que ele deixa passar vira variável de
CSS na tela de alguém — então ele é de **recusa**: só chave conhecida, padrão da lista, número preso
na faixa e cor em `#rrggbb`. São 18 testes, quase todos de recusa.

**A coluna NÃO foi aplicada e a chave está desligada.** Sem `VISUAL_NA_CONTA_HABILITADO=true` o
código publicado funciona sem ela, e a personalização vale no navegador. Para ligar:

```
cd Site/Backend && npm run migrate      # aplica a 0014
# depois: VISUAL_NA_CONTA_HABILITADO=true no painel do Render
```

Nessa ordem. O Sequelize seleciona todas as colunas declaradas no model: ligar a chave antes da
migration derrubaria as preferências de acessibilidade inteiras.

## 9. O que foi verificado, e como

- **tsc**, **eslint** (0 erros, 3 avisos que já existiam), **1848 testes no Site** e **1320 no
  Backend**, **build**.
- **Contraste medido no navegador**, não no papel: pintando um pixel num canvas para o próprio
  navegador converter `oklch` em sRGB. Os cinco pares de estado passam de 4,5:1 nos **seis modos**
  (claro, escuro, daltonismo e alto contraste, cada um nos dois temas).
- `padroesVisuais.test.ts` **refaz essa conta a cada execução** — 149 casos. Cor nova que não passe
  quebra o teste antes de chegar na tela de alguém.
- **Pelas simulações**, aplicadas à página inteira: sob deuteranopia simulada, "Aprovada" e
  "Rejeitada" nas cores da marca ficam **do mesmo tom de oliva**; com o padrão de deuteranopia, elas
  se separam. Nos dois casos o ícone já distingue.
- Os gráficos, no padrão monocromático: as cinco fatias ficam distinguíveis **só pela textura**.

## 10. O que NÃO foi feito, e o que não dá para afirmar

1. **Nada foi testado com leitor de tela**, nem com acionador, nem em aparelho de verdade.
2. **Nada foi validado com pessoas com daltonismo.** Simulação é aproximação; não substitui perguntar.
3. **Não declaro conformidade com a WCAG.** Os critérios são referência; testes automatizados passando
   não são conformidade.
4. **A migration 0014 não foi aplicada** e a chave está desligada (item 8).
5. **As traduções de inglês e espanhol não foram revisadas por pessoa fluente.**
6. O `axe` só pega o que o axe pega: nome acessível, papel, rótulo, atributo ARIA. **Não** pega
   contraste, tamanho de alvo nem ordem de leitura.
