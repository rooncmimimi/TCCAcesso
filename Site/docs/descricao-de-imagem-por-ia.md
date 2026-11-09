# A descrição de imagem por IA, e por que ela não funcionava (09/11/2026)

Relato: **"estou tendo dificuldade para gerar a descrição da imagem com IA"**. Este documento conta o
que estava errado, o que mudou e como conferir sem adivinhar.

Nada aqui custa dinheiro: continua tudo em modelo gratuito da OpenRouter.

## 1. O que estava errado

A lista de modelos tinha três nomes. **Dois deles nunca poderiam funcionar.**

| Modelo configurado | Situação real |
|---|---|
| `minimax/minimax-m3:free` | **não existe** na OpenRouter. Existe `minimax/minimax-m3`, que é pago. |
| `google/gemma-4-31b-it:free` | existe, aceita imagem — era o único que respondia |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | existe, mas **devolvia texto vazio sempre** |

O terceiro é o erro mais interessante, e está na documentação da própria OpenRouter: na API de chat,
o `max_tokens` é um orçamento **compartilhado entre o raciocínio interno do modelo e o texto
visível**. O pedido mandava `max_tokens: 150`. Esse modelo é de raciocínio e vem com raciocínio
ligado por padrão (`reasoning.default_enabled: true`): ele gastava os 150 tokens pensando e a
resposta voltava com `finish_reason: "length"` e `content` vazio. O código via o texto vazio e
desistia com "o serviço de sugestão não retornou uma descrição válida".

Resultado: a sugestão dependia de **um** modelo gratuito. Modelo gratuito tem teto de pedidos por
minuto e por dia; no minuto em que aquele teto era atingido, ou o provedor ficava ocupado, o recurso
inteiro parava.

E a reserva não salvava, porque o pedido usava o parâmetro `models` da OpenRouter (a lista toda numa
chamada). Esse parâmetro só troca de modelo quando o provedor **devolve erro** — e as duas falhas
daqui não são erro: a resposta vem 200, com texto vazio ou com algo que não é descrição (um modelo já
devolveu literalmente `User Safety: safe`, de um classificador de moderação).

## 2. O que mudou

**Um pedido por modelo, e troca de verdade.** `OpenRouterService` tenta um modelo por vez e passa ao
próximo quando a resposta não serve — texto vazio, erro dentro de um 200, id que não existe mais, ou
uma resposta que quem chamou recusou. A decisão de recusar é de quem pediu
(`SugestaoDescricaoService`), que é quem sabe o que é uma descrição.

**Raciocínio desligado** (`reasoning: { enabled: false }`) e orçamento de tokens folgado. Nenhum dos
modelos gratuitos com visão exige raciocínio, então desligar é seguro em todos.

**Lista nova, conferida em `GET /api/v1/models`** — cinco modelos gratuitos que aceitam imagem, de
três provedores diferentes (a cota gratuita é contada por modelo, então variar o provedor é o que
dá reserva real).

**A imagem é reduzida no navegador** antes de sair (`lib/imagemParaDescricao.ts`): 1024 px no lado
maior, JPEG. Uma foto de 4 MB virava ~5,5 MB de base64 no pedido ao modelo — modelo gratuito
desiste disso. Para dizer o que aparece numa foto, 1024 px é mais do que suficiente, e o pedido cai
de dezenas de segundos para alguns. De graça, e com dois efeitos de brinde: a orientação do EXIF é
respeitada (foto tirada em pé não é descrita de lado) e os metadados da foto, inclusive GPS, não
saem do navegador.

**A descrição sai no idioma do Site.** Era sempre português. Numa plataforma que agora fala três
idiomas, uma descrição alternativa em português não serve para quem está lendo a página em espanhol
— e é justamente quem depende dela.

**O botão não aparece sem a chave configurada.** O Site pergunta antes
(`GET /postagens/anexos/sugerir-descricao/disponibilidade`). O `.env.example` já prometia isso; o
código não cumpria, e a pessoa clicava num botão que sempre dava erro.

**Mensagem de erro que diz o que aconteceu**: chave recusada, cota do gratuito esgotada, limite por
minuto, tempo esgotado, ou a geral — cada uma com o caminho de saída ("escreva a descrição
manualmente").

## 3. Dois erros achados no caminho

- **A imagem era salva em disco.** A rota prometia, em comentário, que "a foto em si nunca é salva
  aqui", e usava `uploadImagem`, que só é em memória quando o Supabase Storage está configurado. Em
  qualquer ambiente sem Storage, o multer gravava a imagem em `uploads/` **e** `req.file.buffer`
  vinha `undefined`, o que virava um `TypeError` e um 500 sem explicação. Agora existe
  `uploadImagemParaLer`, sempre em memória, com a conferência de assinatura do arquivo que as outras
  rotas de leitura já tinham.
- **A regra que barra resposta inválida barrava descrição legítima.** Ela recusava qualquer texto com
  a palavra `safety` ou `blocked`. Em português isso nunca aparece; em inglês, `a safety helmet` e
  `a blocked doorway` são descrição de verdade. Agora são frases inteiras (`user safety`,
  `content policy`, `cannot assist`...), não palavras soltas, nos três idiomas.

## 4. Como conferir

```
cd Site/Backend
npm run descricao:verificar -- caminho/da/imagem.png
```

Sem imagem, ele faz só o que não custa nada: diz se a chave está preenchida, se a OpenRouter a
aceita, quantos pedidos a modelos gratuitos ainda cabem hoje, e se cada modelo da lista existe e
aceita imagem. Com uma imagem, tenta **um modelo por vez** e imprime o que cada um respondeu ou por
que não serviu — e depois o caminho completo, igual ao do Site, nos três idiomas. A chave nunca é
impressa.

## 5. O que isso não resolve

1. **Nenhuma sugestão foi conferida por uma pessoa cega**, nem por quem usa leitor de tela todo dia.
   A sugestão é um rascunho, e o Site diz isso na tela: quem publica revisa antes.
2. **O teto do plano gratuito continua existindo.** Em dia de muito uso, a sugestão pode faltar — e
   é por isso que escrever à mão nunca depende dela, e nunca vai depender.
3. **A tradução das descrições é a do modelo.** O prompt pede o idioma certo, mas ninguém fluente
   revisou o que sai em inglês e em espanhol.
4. Os testes cobrem o comportamento com a rede simulada. Que um modelo gratuito **específico**
   responda bem a uma foto real é coisa que só o comando do item 4 responde, com a chave de verdade.
