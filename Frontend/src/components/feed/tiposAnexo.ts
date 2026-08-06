/** Tipos de arquivo aceitos no composer de publicações. */
export const TIPOS_IMAGEM_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
export const TIPOS_DOCUMENTO_ACEITOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const TIPOS_ACEITOS = [...TIPOS_IMAGEM_ACEITOS, ...TIPOS_DOCUMENTO_ACEITOS];
export const MAX_ANEXOS = 4;
export const MAX_CARACTERES = 3000;

export function ehImagem(arquivo: File): boolean {
  return TIPOS_IMAGEM_ACEITOS.includes(arquivo.type);
}
