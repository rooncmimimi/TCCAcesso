import { ehImagem } from "./tiposAnexo";

/**
 * Índices das imagens INFORMATIVAS (não marcadas como decorativas) que estão sem descrição. Vídeo não
 * entra: a descrição dele é outro tipo de campo.
 */
export function imagensSemDescricao(anexos: File[], descricoes: string[], decorativas: boolean[]): number[] {
  return anexos.flatMap((arquivo, indice) => (ehImagem(arquivo) && !decorativas[indice] && !(descricoes[indice] ?? "").trim() ? [indice] : []));
}
