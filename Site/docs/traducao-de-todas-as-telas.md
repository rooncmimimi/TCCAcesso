# Todas as telas em português, inglês e espanhol (09/11/2026)

Pedido: **"quero todas as telas funcionando com os idiomas"**. Antes disto, 19 das 259 telas liam os textos
do dicionário; as outras tinham o português escrito dentro do código e continuavam em português mesmo com o
site em inglês ou espanhol.

## 1. O tamanho real do trabalho

| Medida | Antes | Depois |
|---|---|---|
| Telas que leem do dicionário | 19 | **173** |
| Chaves no dicionário (×3 idiomas) | 330 | **1 546** |
| Textos escritos dentro do código | ~1 250 | **0** |

A primeira medição apontou ~780 textos; o número só ficou certo depois de o extrator aprender a ver props de
componentes do projeto (`titulo=`, `detalhe=`), texto depois de uma tag e texto em linha própria.

## 2. Como foi feito, em duas fases

A troca no código é a parte arriscada; a tradução é volume. Separar as duas permitiu fazer a parte arriscada
uma vez só, conferida pelo compilador e pelos testes, e depois traduzir mexendo **só em dicionário**.

**Fase 1 — o código passa a ler do dicionário** (commit `532741b`, 165 arquivos, 1 136 trocas). Uma
ferramenta fez a troca mecânica e o que ela não sabia fazer saiu listado para a mão:

- texto solto de JSX, texto depois de uma tag, texto em linha própria e atributos que a pessoa lê
  (`aria-label`, `placeholder`, `title`, `alt` e as props de texto dos componentes do projeto);
- **constantes de módulo** (onde não existe `t`) passaram a guardar a **chave**, com o tipo `ChaveBase`, e
  quem renderiza chama `t(...)`. O compilador cobra: não dá para pôr um texto solto no lugar de uma chave;
- **26 frases que o JSX quebrava em duas linhas** viravam duas chaves — o que destruiria a ordem das palavras
  em outro idioma. Foram juntadas numa chave só;
- textos repetidos em telas diferentes reaproveitam a mesma chave (152 casos).

**Fase 2 — as traduções**, em dez lotes, escritas à mão (não por tradutor automático): 1 229 chaves em inglês
e espanhol. As dez que continuam iguais ao português são palavras que não mudam: Links, Status, Total, Admin,
Logs, Banner, Logo, LinkedIn.

### O que a ferramenta errou, e como apareceu

Três falsos positivos, todos pegos pelo compilador ou pelos testes antes de chegar perto de produção:

1. **`=>` termina em `>`**: `useState(() => Date.now())` e `() => Promise<File | Blob>` viraram "texto de
   tela". A regra passou a exigir que o `>` não venha de uma seta.
2. **Import dentro de import**: o import novo entrava no meio de um `import { … } from` de várias linhas.
   Agora entra depois do último import **completo**.
3. **Chave lida como texto**: numa segunda passada, o extrator leu as chaves que ele mesmo tinha escrito e
   criou chaves de chaves (`sobre-nos.sobreNosSobrenosmissao`). As 20 chaves de lixo foram apagadas.

As telas `routes/cadastro/candidato.tsx` e `dados.tsx` ficaram de fora de propósito: elas têm o dicionário
delas (`components/cadastro/idioma.ts`) e já chamam o próprio `t`.

## 3. Como foi verificado

- **`tsc` limpo, `eslint` sem erros, `vite build`** e a suíte inteira: **109 arquivos, 1 549 testes**. O
  teste que cobra "en e es não ficaram iguais ao português" volta a passar.
- **No navegador**, com o site em espanhol e em inglês: página inicial, sobre nós, central de comunicação,
  dicionário de profissões, objetivos e configurações de acessibilidade — todas em espanhol, sem nenhuma
  chave crua aparecendo na tela, e com `<html lang>` acompanhando.
- Os testes de dicionário que já existiam cobrem as 1 546 chaves sozinhos: mesmas chaves nos três idiomas,
  nada vazio, mesmas variáveis e nada esquecido em português.

## 4. O que continua faltando

1. **O título da aba** (o que o leitor de tela anuncia ao abrir a página) acompanha o idioma **só na página
   inicial**. Nas outras rotas ele vem do `head` da rota, que roda fora do React. O mesmo vale para a
   `description` que aparece no Google.
2. **Mensagens de erro do servidor e e-mails** continuam em português: são do Backend, fora desta rodada.
3. **As traduções não foram revisadas por uma pessoa fluente** em inglês ou espanhol, nem usadas por alguém
   que precise delas para ler o site.
4. **Sem custo**: nenhuma dependência nova, nenhum serviço, nenhuma migration.
