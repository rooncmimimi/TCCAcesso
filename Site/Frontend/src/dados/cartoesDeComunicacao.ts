import { tx } from "@/i18n/frases";

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
  { id: "responder", get titulo() { return tx("Para responder"); }, get descricao() { return tx("Quando você precisa de tempo ou de outro formato para responder."); } },
  { id: "ajuda", get titulo() { return tx("Para pedir ajuda"); }, get descricao() { return tx("Quando algo não ficou claro."); } },
  { id: "adaptacoes", get titulo() { return tx("Para pedir adaptações"); }, get descricao() { return tx("Quando você quer combinar como participar."); } },
  { id: "pausa", get titulo() { return tx("Para pausas"); }, get descricao() { return tx("Quando você precisa parar um pouco."); } },
];

export type CartaoDeComunicacao = { id: string; texto: string; grupo: GrupoDeCartao };

export const CARTOES_PADRAO: readonly CartaoDeComunicacao[] = [
  { id: "momento", get texto() { return tx("Preciso de um momento para responder."); }, grupo: "responder" },
  { id: "por-escrito", get texto() { return tx("Prefiro responder por escrito."); }, grupo: "responder" },
  { id: "responder-depois", get texto() { return tx("Posso responder depois, por mensagem?"); }, grupo: "responder" },
  { id: "sim", get texto() { return tx("Sim."); }, grupo: "responder" },
  { id: "nao", get texto() { return tx("Não."); }, grupo: "responder" },
  { id: "repetir", get texto() { return tx("Poderia repetir a pergunta?"); }, grupo: "ajuda" },
  { id: "devagar", get texto() { return tx("Poderia falar mais devagar?"); }, grupo: "ajuda" },
  { id: "nao-compreendi", get texto() { return tx("Não compreendi a instrução."); }, grupo: "ajuda" },
  { id: "ajuda", get texto() { return tx("Preciso de ajuda."); }, grupo: "ajuda" },
  { id: "escrever-pergunta", get texto() { return tx("Pode escrever a pergunta no chat?"); }, grupo: "ajuda" },
  { id: "adaptacao", get texto() { return tx("Gostaria de solicitar uma adaptação."); }, grupo: "adaptacoes" },
  { id: "legendas", get texto() { return tx("Podemos usar legendas ou texto nesta conversa?"); }, grupo: "adaptacoes" },
  { id: "interprete", get texto() { return tx("Posso participar com um intérprete de Libras?"); }, grupo: "adaptacoes" },
  { id: "tempo-adicional", get texto() { return tx("Preciso de um pouco mais de tempo para responder."); }, grupo: "adaptacoes" },
  { id: "pausa", get texto() { return tx("Preciso de uma pausa."); }, grupo: "pausa" },
  { id: "voltar-ja", get texto() { return tx("Já volto. Obrigado(a) por esperar."); }, grupo: "pausa" },
  { id: "pode-continuar", get texto() { return tx("Obrigado(a). Podemos continuar."); }, grupo: "pausa" },
];
