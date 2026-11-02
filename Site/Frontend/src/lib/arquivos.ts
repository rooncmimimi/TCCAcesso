import { formatarTamanhoArquivo } from "@/utils/formatacao";

/**
 * Regras de arquivo do Site, num lugar só: quais tipos cada tela aceita e qual o tamanho máximo de cada
 * categoria. Foto de perfil, capa, publicações, currículo e importação usam as mesmas constantes, em
 * vez de cada componente ter a sua cópia (eram cinco, com o 5 MB escrito à mão).
 *
 * Os valores são os do servidor (`MAX_UPLOAD_BYTES` = 5 MB e `MAX_VIDEO_UPLOAD_BYTES` = 50 MB, em
 * `Backend/src/config/env.js`), e um teste confere que as duas pontas concordam. Esta checagem só poupa
 * o envio de um arquivo que o servidor recusaria: **quem valida de verdade é o servidor**, que confere o
 * tipo, a assinatura binária e o tamanho de cada arquivo.
 */

export const MB = 1024 * 1024;

export type CategoriaArquivo = "imagem" | "video" | "documento";

/** Tamanho máximo, em bytes. Imagem e documento compartilham o limite; vídeo tem o seu, maior. */
export const LIMITE_BYTES: Record<CategoriaArquivo, number> = {
  imagem: 5 * MB,
  documento: 5 * MB,
  video: 50 * MB,
};

export const TIPOS_MIME: Record<CategoriaArquivo, readonly string[]> = {
  imagem: ["image/png", "image/jpeg", "image/webp"],
  video: ["video/mp4", "video/webm"],
  documento: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export const EXTENSOES: Record<CategoriaArquivo, readonly string[]> = {
  imagem: [".png", ".jpg", ".jpeg", ".webp"],
  video: [".mp4", ".webm"],
  documento: [".pdf", ".doc", ".docx"],
};

const FORMATOS: Record<CategoriaArquivo, string> = {
  imagem: "PNG, JPEG ou WEBP",
  video: "MP4 ou WEBM",
  documento: "PDF, DOC ou DOCX",
};

/** Currículo que a importação sabe ler: PDF e DOCX (o `.doc` antigo não tem extração de texto). */
export const TIPOS_IMPORTAVEIS: readonly string[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const EXTENSOES_IMPORTAVEIS: readonly string[] = [".pdf", ".docx"];

export function limiteEmMb(categoria: CategoriaArquivo): number {
  return LIMITE_BYTES[categoria] / MB;
}

/** A categoria do arquivo pelo tipo declarado, ou `null` se nenhuma tela aceita esse tipo. */
export function categoriaDoArquivo(arquivo: Pick<File, "type">): CategoriaArquivo | null {
  for (const categoria of ["imagem", "video", "documento"] as const) {
    if (TIPOS_MIME[categoria].includes(arquivo.type)) return categoria;
  }

  return null;
}

export type ResultadoArquivo =
  | { ok: true }
  | { ok: false; motivo: "vazio" | "tipo" | "tamanho"; mensagem: string };

/** "uma imagem PNG, JPEG ou WEBP", "um arquivo PDF, DOC ou DOCX" ou "imagens (...) ou vídeos (...)". */
function descricaoDosFormatos(categorias: readonly CategoriaArquivo[]): string {
  if (categorias.length === 1) {
    const [unica] = categorias;
    return `${unica === "imagem" ? "uma imagem" : unica === "video" ? "um vídeo" : "um arquivo"} ${FORMATOS[unica]}`;
  }

  return categorias
    .map((c) => `${c === "imagem" ? "imagens" : c === "video" ? "vídeos" : "documentos"} (${FORMATOS[c]})`)
    .join(" ou ");
}

/**
 * Confere um arquivo antes do envio: não vazio, de um tipo que a tela aceita e dentro do limite da sua
 * categoria. `tipos` restringe ainda mais os tipos (por exemplo, só PDF e DOCX para importar currículo).
 * A mensagem diz o que está errado e qual é o limite, com o tamanho do arquivo escolhido.
 */
export function verificarArquivo(
  arquivo: Pick<File, "type" | "size">,
  categorias: readonly CategoriaArquivo[],
  opcoes: { tipos?: readonly string[]; formatos?: string } = {},
): ResultadoArquivo {
  const categoria = categoriaDoArquivo(arquivo);
  const tipoAceito =
    categoria !== null &&
    categorias.includes(categoria) &&
    (opcoes.tipos ? opcoes.tipos.includes(arquivo.type) : true);

  if (!tipoAceito) {
    const formatos = opcoes.formatos ?? descricaoDosFormatos(categorias);

    return { ok: false, motivo: "tipo", mensagem: `Formato inválido. Envie ${formatos}.` };
  }

  if (arquivo.size <= 0) {
    return { ok: false, motivo: "vazio", mensagem: "O arquivo está vazio. Escolha outro." };
  }

  if (arquivo.size > LIMITE_BYTES[categoria]) {
    const nome = categoria === "imagem" ? "Imagem" : categoria === "video" ? "Vídeo" : "Arquivo";

    return {
      ok: false,
      motivo: "tamanho",
      mensagem: `${nome} muito grande (${formatarTamanhoArquivo(arquivo.size)}). O limite é ${limiteEmMb(categoria)} MB.`,
    };
  }

  return { ok: true };
}

/** Valor do atributo `accept` do `<input type="file">`: tipos e extensões, para o seletor filtrar bem. */
export function atributoAccept(
  categorias: readonly CategoriaArquivo[],
  opcoes: { tipos?: readonly string[]; extensoes?: readonly string[] } = {},
): string {
  const tipos = opcoes.tipos ?? categorias.flatMap((c) => TIPOS_MIME[c]);
  const extensoes = opcoes.extensoes ?? categorias.flatMap((c) => EXTENSOES[c]);

  return [...tipos, ...extensoes].join(",");
}
