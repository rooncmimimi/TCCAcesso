# O que faltava para o idioma alcançar todas as telas (09/11/2026)

A rodada anterior ([traducao-de-todas-as-telas.md](traducao-de-todas-as-telas.md)) disse "o site inteiro está
traduzido". Não estava. Resposta ao relato **"o idioma ainda não alcança todas as telas"**: este documento
conta o que tinha escapado, por quê, e o que foi feito.

## 1. O erro de método da rodada anterior

A ferramenta daquela rodada perguntava, de cada trecho, **"isto parece português?"** — acento ou palavra da
lista. É a pergunta errada. `curtidas`, `anexo`, `vaga`, `Ver detalhes`, `Pendente` e `Aprovada` não têm
acento nem palavra da lista: eram lidos como identificador e ficavam para trás.

Esta rodada troca a pergunta por **"isto está num lugar onde o navegador desenha texto?"**. O lugar decide;
o idioma não entra na conta. Com isso apareceram **8 famílias** que nenhuma regra via:

| Família | Exemplo | Por que escapava |
|---|---|---|
| texto depois de uma expressão | `{salvando && <Loader2/>}`⏎`Salvar` | a regra exigia que a linha anterior fechasse uma **tag** |
| palavra sozinha numa linha | `Cancelar` | a regra pulava texto de uma palavra só |
| texto antes de uma tag | `Enviar link <ArrowRight/>` | todas as regras olhavam o que vinha **depois** de uma tag |
| texto antes de `{" "}` | `Já tem um código?{" "}` | a linha tem `{`, e isso a descartava |
| `toast` e reserva de erro | `toast.success("Vaga removida.")` | só JSX e atributos eram olhados |
| template literal | `` `Ver perfil de ${nome}` `` | a varredura só aceitava crase **sem** interpolação |
| constante de módulo | `ROTULOS = { em_analise: "Em análise" }` | fora de componente, e o valor não é JSX |
| mensagem de validação | `z.string().min(1, "Informe o e-mail.")` | o esquema é montado antes de existir idioma |

## 2. Quatro erros que já estavam no ar

Procurar isso descobriu quatro defeitos que a rodada anterior **introduziu** e que nenhum teste pegava:

1. **Chave crua na tela.** `TIPO_ROTULO` (denúncias) e as opções de tamanho de alvo em Configurações
   guardavam a chave, mas o render não chamava `t`: a pessoa lia
   `acessibilidade.secaoMotricidade.padrao44Px` na tela. **Dez opções** em três listas. Achado no navegador,
   não no compilador — chave é `string`, então tudo compilava.
2. **Comparação quebrada pela tradução.** No teste de voz, `o === "Não testei"` comparava com o rótulo
   **depois** de ele passar por `t`: em espanhol a comparação nunca dava certo, o botão "Não testei" não
   marcava e o valor enviado ao diagnóstico virava o rótulo traduzido.
3. **Espaços comidos.** `" · última atividade "` virou chave sem os espaços das pontas, e a tela mostrava
   "última atividadehá 3 horas".
4. **Tela de cadastro presa em português.** `routes/cadastro/dados.tsx` fazia `textosDoCadastro("pt")` — a
   tela inteira ficava em português em qualquer idioma.

E dois que esta rodada criou e corrigiu antes de terminar: `t(...)` escrito **dentro** de um texto de tela
(a regra trocou aspas que eram da frase, não de uma string) e dois botões sem nome acessível, pego pelo axe.

## 3. O que passou a existir

- **`i18n/Frase.tsx`** — frase com link, negrito ou valor **no meio**, sem picar a frase. O texto mora numa
  chave só, com marcas numeradas (`Abra uma <1>vaga</1>`), e quem traduz pode mover a marca para onde a
  frase pedir. Antes, cada pedaço virava uma chave e a ordem das palavras quebrava em outro idioma.
- **`i18n/textoDaPagina.ts`** — traduz **fora do React**, para o `head()` das rotas. Resolve a pendência que
  a rodada anterior deixou registrada: o título da aba agora acompanha o idioma em **todas** as telas, não
  só na inicial. É a primeira coisa que um leitor de tela anuncia.
- **`lib/regrasDeSenha.ts`** — as cinco regras de senha do backend numa cópia só (estavam escritas três
  vezes, as três em português fixo).
- **`index.html`** — um script de cinco linhas põe o `lang` certo **antes** do React montar, e remove a
  `description` padrão para a página não ficar com duas. Sem isso, a página inteira era anunciada com a
  pronúncia errada até a árvore montar.

## 4. Números

| | Antes desta rodada | Depois |
|---|---|---|
| Chaves no dicionário (×3 idiomas) | 1 546 | **2 329** |
| Telas lendo do dicionário | 173 | **188** |
| Textos de tela em português no código | ~780 | **0** |

783 chaves novas, **546 traduções escritas à mão** (as outras já nasciam traduzidas). As únicas quatro
chaves iguais nos três idiomas são palavras que não mudam: Visual, Feed, Item e `ACESSO · WCAG 2.2 · VLibras`.

## 5. Como foi verificado

- `tsc` limpo, `eslint` sem erros, `vite build`, **110 arquivos e 1 559 testes**.
- **No navegador, 20 telas em espanhol e 11 em inglês**, procurando duas coisas: chave crua (`a.b.c`) e
  caracteres que só existem em português (`ã`, `õ`, `ç`). **Zero** das duas. Foi esta conferência — e não o
  compilador nem os testes — que achou os quatro defeitos do item 2.
- A validação de formulário foi testada enviando o formulário vazio com o site em espanhol: o erro sai em
  espanhol.

## 6. O que continua faltando

1. **O conteúdo, não a interface**: o dicionário de profissões (227 textos), os países, os documentos
   legais, o glossário e os cartões de comunicação seguem só em português. São `src/dados/` e parte de
   `src/lib/` — texto de leitura, não moldura de tela. O botão "Traduzir" atende esse caso.
2. **Mensagens de erro do servidor e e-mails** continuam em português (são do Backend).
3. **Nenhuma tradução foi revisada por uma pessoa fluente** em inglês ou espanhol, nem usada por alguém que
   precise delas para ler o site.
