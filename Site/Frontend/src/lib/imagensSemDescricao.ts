import type { AnexoPostagem, PostagemCompleta } from "@/types";

export type ImagemParaRevisar = {
  postagemId: string;
  trechoDaPublicacao: string;
  anexo: AnexoPostagem;
};

const TRECHO = 80;

const trecho = (texto: string | null | undefined) => {
  const limpo = (texto ?? "").replace(/\s+/g, " ").trim();

  return limpo.length > TRECHO ? `${limpo.slice(0, TRECHO)}…` : limpo;
};

/**
 * Imagens das publicações da própria pessoa que ainda estão SEM descrição (texto alternativo).
 * Só olha imagens: documentos e vídeos têm outro tratamento. Descrição só com espaços conta como
 * ausente. A ordem é a das publicações recebidas.
 */
export function imagensSemDescricao(postagens: PostagemCompleta[]): ImagemParaRevisar[] {
  const resultado: ImagemParaRevisar[] = [];

  for (const postagem of postagens) {
    for (const anexo of postagem.anexos ?? []) {
      if (anexo.tipo === "imagem" && !(anexo.descricao ?? "").trim()) {
        resultado.push({ postagemId: postagem.id, trechoDaPublicacao: trecho(postagem.conteudo), anexo });
      }
    }
  }

  return resultado;
}
