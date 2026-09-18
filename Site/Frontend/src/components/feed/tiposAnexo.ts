/** Tipos de arquivo aceitos no composer de publicações. */
export const TIPOS_IMAGEM_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
/**
 * Vídeo de postagem: só os dois formatos com reprodução ampla no navegador (a mesma lista do
 * backend, `MIME_VIDEOS` em `uploadMiddleware.js`). Publicações não aceitam documento; currículo e
 * certificado têm upload próprio, fora do composer.
 */
export const TIPOS_VIDEO_ACEITOS = ["video/mp4", "video/webm"];
export const TIPOS_ACEITOS = [...TIPOS_IMAGEM_ACEITOS, ...TIPOS_VIDEO_ACEITOS];
export const LIMITE_ANEXOS = 4;
export const LIMITE_CARACTERES = 3000;

export function ehImagem(arquivo: File): boolean {
  return TIPOS_IMAGEM_ACEITOS.includes(arquivo.type);
}

export function ehVideo(arquivo: File): boolean {
  return TIPOS_VIDEO_ACEITOS.includes(arquivo.type);
}
