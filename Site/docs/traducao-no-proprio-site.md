# O tradutor passa a funcionar dentro do site (08/11/2026)

Relato: clicar em **Traduzir** respondia *"Seu navegador ainda não traduz textos sozinho. Use o tradutor do
navegador (no Chrome: clique com o botão direito e escolha 'Traduzir para...')"*. Ou seja: o botão existia e
não traduzia nada — mandava a pessoa resolver por fora.

## 1. Por que não traduzia

O único motor era o **tradutor embutido do navegador** (as APIs `Translator` e `LanguageDetector` do Chrome).
Medido no Chromium 152, no navegador do app:

| O que o site perguntava | O que o navegador respondeu |
|---|---|
| `typeof Translator` | `"function"` — existe |
| `typeof LanguageDetector` | `"function"` — existe |
| `Translator.availability({pt → es})` | **nunca respondeu** |

Então o site achava que dava (o teste era "a função existe"), esperava os 8 segundos do prazo interno,
desistia e caía na mensagem de "não suportado". O mesmo acontecia antes disso com o detector de idioma, que
tinha o seu próprio prazo de 5 segundos. Resultado: treze segundos de espera para um beco sem saída.

Era o caso que o comentário do próprio código já previa — "há navegadores que expõem a API sem o motor por
trás, e a promessa nunca resolve" — mas que nunca tinha sido visto acontecer.

## 2. O motor agora tem reserva

`i18n/tradutorComReserva.ts` escolhe entre dois:

1. **O tradutor embutido do navegador**, quando ele está realmente pronto para o par de idiomas. É o melhor:
   roda no aparelho, o texto não sai dele e não tem limite. Uma sondagem de **2 segundos** pergunta se está
   pronto; a resposta fica guardada enquanto a aba estiver aberta, então isso acontece uma vez por par.
2. **Um serviço gratuito na internet** (MyMemory), quando o embutido não responde, não existe, ainda precisa
   baixar o modelo do idioma (o que levaria minutos no primeiro uso) ou promete e falha no meio.

O **detector de idioma** também inverteu a ordem: primeiro o palpite local que o site já tinha
(`lib/idiomaDaFala`, que distingue os três idiomas por palavras comuns e responde na hora), e só quando ele
não sabe é que o detector do navegador é consultado — com prazo de 1,5 segundo, em vez de 5.

### Detalhes que importam

- O pedido sai **do navegador de quem lê**, não do servidor do ACESSO. Duas consequências boas: o limite
  gratuito é por endereço de internet, então cada pessoa tem a sua cota em vez de todo mundo dividir a do
  servidor; e o ACESSO não passa a ver o que cada pessoa traduz.
- Sem chave, sem cadastro e **sem e-mail**: nada identifica quem pediu além do endereço de internet que
  qualquer site já vê. O serviço documenta um limite gratuito anônimo de cerca de 5 000 palavras por dia
  (número da documentação dele; não foi medido aqui).
- O serviço recusa pedidos acima de 500 bytes, então o texto é partido em pedaços de até 450 bytes, cortando
  em quebra de linha ou fim de frase. Juntar os pedaços devolve exatamente o original, com as quebras de
  linha e os espaços no lugar. Os pedidos saem em sequência, não em paralelo.
- Cada motivo de falha tem a sua explicação: limite diário, sem internet, texto longo demais, ou falha do
  serviço. Antes era tudo "não foi possível traduzir agora".

## 3. O texto sai do aparelho, e isso é dito

Usar um serviço de fora significa que o texto da publicação sai do aparelho de quem lê. Isso não acontece
sem a pessoa saber:

- Na **primeira** tradução que precisaria do serviço, o botão não traduz: aparece a explicação —
  *"Para traduzir, este texto precisa ser enviado a um serviço de tradução na internet: ele sai do seu
  aparelho. Nada mais é enviado, e você só é perguntado uma vez."* — com **Traduzir mesmo assim** e
  **Agora não**.
- A pergunta acontece **na própria tela**, não num diálogo: quem usa leitor de tela ou acionador não é
  arrancado do lugar onde estava, e a explicação fica junto do botão que a causou.
- "Agora não" é um caminho de volta de verdade: nada fica guardado e dá para pedir de novo.
- Depois de traduzido, a tela diz *"Traduzido por um serviço online."* junto de "Traduzido do X para o Y".
- A resposta fica guardada **neste navegador** (`localStorage`). Quando o tradutor embutido está pronto, nada
  disso aparece, porque o texto não sai do aparelho.

## 4. A interface também passou a ser traduzida

A página inicial era a maior barreira: é a primeira tela de quem chega e continuava **inteira em português**
com o site em inglês ou espanhol. Agora:

- As 45 frases da página inicial estão nos três dicionários (`pt`, `en`, `es`).
- O **seletor de idioma entrou na primeira tela**: no cabeçalho em tela larga e no rodapé em tela estreita.
  Antes dele, quem não lia português só encontrava a troca de idioma depois de entrar na conta — ou seja,
  depois de atravessar em português justamente as telas que precisava entender.
- O **título da aba** acompanha o idioma. O `head` da rota roda fora do React e ficava fixo em português; é
  a primeira coisa que um leitor de tela anuncia ao abrir a página.

## 5. Como foi verificado

- **No navegador, contra o serviço de verdade** (não contra um teste): `pt → es` devolveu
  *"Vacante para auxiliar administrativo con accesibilidad real y horario flexible."*; um texto de dois
  parágrafos em `pt → en` foi partido em vários pedidos, voltou traduzido e **com as quebras de linha
  preservadas**. O CORS passa, então o pedido sai do navegador sem intermediário.
- **A página inicial em espanhol**, no navegador: título, selo, chamadas, os quatro recursos, as seções de
  vagas e empresas e o rodapé, tudo em espanhol; `<html lang>` virou `es-ES` e o título da aba também mudou.
- **Refluxo a 320 px** (WCAG 1.4.10) refeito com o seletor novo no rodapé: sem rolagem lateral, nada
  estourando no cabeçalho nem no rodapé.
- **34 testes novos**: `i18n/tradutorOnline.test.ts` (13: partição do texto, entidades HTML, limite diário,
  sem rede, texto longo), `i18n/tradutorComReserva.test.ts` (8: inclusive o caso real do `availability()` que
  nunca responde) e 4 em `hooks/useTraducao.test.tsx` para a autorização. Os testes de dicionário que já
  existiam cobrem as chaves novas sozinhos (mesmas chaves nos três idiomas, nada vazio, nada esquecido em
  português).
- Suíte inteira: **109 arquivos, 1549 testes**, mais `tsc`, `eslint` (0 erros) e `vite build`.

## 6. O que continua faltando

1. **A maior parte do site ainda não está traduzida.** 19 das 259 telas usam o dicionário. A página inicial e
   as telas públicas principais (entrar, cadastro, vagas, feed) estão; o resto — perfil, mensagens,
   configurações, administração — segue em português em qualquer idioma.
2. **A `description` da página** (a que aparece no Google) continua só em português, pelo mesmo motivo do
   título: o `head` roda fora do React. O título foi resolvido porque é lido em voz alta; a descrição não.
3. **A qualidade é de tradução automática.** Serve para entender uma publicação, não para um texto oficial.
4. **Ninguém usou isso de verdade ainda.** Foi verificado por mim, no navegador, com o serviço real — não por
   uma pessoa que precise da tradução para ler o site.
5. **Sem custo**: nenhuma dependência nova, nenhum serviço pago, nenhuma chave, nenhuma migration.
