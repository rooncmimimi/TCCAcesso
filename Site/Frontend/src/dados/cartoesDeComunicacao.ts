/**
 * Cartões de comunicação alternativa: frases prontas para a pessoa mostrar na tela, ouvir em voz
 * alta, copiar ou colocar numa mensagem. Servem para entrevistas, conversas com recrutadores e o dia
 * a dia, para quem prefere ou precisa se comunicar por texto, por cartões ou com apoio.
 *
 * Escritas à mão, curtas e na primeira pessoa. Nada aqui presume uma deficiência: qualquer pessoa
 * pode usar qualquer cartão.
 */

export type GrupoDeCartao = "responder" | "ajuda" | "adaptacoes" | "pausa";

export const GRUPOS_DE_CARTOES: ReadonlyArray<{ id: GrupoDeCartao; titulo: string; descricao: string }> = [
  { id: "responder", titulo: "Para responder", descricao: "Quando você precisa de tempo ou de outro formato para responder." },
  { id: "ajuda", titulo: "Para pedir ajuda", descricao: "Quando algo não ficou claro." },
  { id: "adaptacoes", titulo: "Para pedir adaptações", descricao: "Quando você quer combinar como participar." },
  { id: "pausa", titulo: "Para pausas", descricao: "Quando você precisa parar um pouco." },
];

export type CartaoDeComunicacao = { id: string; texto: string; grupo: GrupoDeCartao };

export const CARTOES_PADRAO: readonly CartaoDeComunicacao[] = [
  { id: "momento", texto: "Preciso de um momento para responder.", grupo: "responder" },
  { id: "por-escrito", texto: "Prefiro responder por escrito.", grupo: "responder" },
  { id: "responder-depois", texto: "Posso responder depois, por mensagem?", grupo: "responder" },
  { id: "sim", texto: "Sim.", grupo: "responder" },
  { id: "nao", texto: "Não.", grupo: "responder" },
  { id: "repetir", texto: "Poderia repetir a pergunta?", grupo: "ajuda" },
  { id: "devagar", texto: "Poderia falar mais devagar?", grupo: "ajuda" },
  { id: "nao-compreendi", texto: "Não compreendi a instrução.", grupo: "ajuda" },
  { id: "ajuda", texto: "Preciso de ajuda.", grupo: "ajuda" },
  { id: "escrever-pergunta", texto: "Pode escrever a pergunta no chat?", grupo: "ajuda" },
  { id: "adaptacao", texto: "Gostaria de solicitar uma adaptação.", grupo: "adaptacoes" },
  { id: "legendas", texto: "Podemos usar legendas ou texto nesta conversa?", grupo: "adaptacoes" },
  { id: "interprete", texto: "Posso participar com um intérprete de Libras?", grupo: "adaptacoes" },
  { id: "tempo-adicional", texto: "Preciso de um pouco mais de tempo para responder.", grupo: "adaptacoes" },
  { id: "pausa", texto: "Preciso de uma pausa.", grupo: "pausa" },
  { id: "voltar-ja", texto: "Já volto. Obrigado(a) por esperar.", grupo: "pausa" },
  { id: "pode-continuar", texto: "Obrigado(a). Podemos continuar.", grupo: "pausa" },
];
