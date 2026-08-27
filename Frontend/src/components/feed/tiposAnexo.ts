/** Tipos de arquivo aceitos no composer de publicações. */
export const TIPOS_IMAGEM_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
/**
 * Vídeo de postagem: apenas os dois formatos com suporte de reprodução
 * amplo no navegador (mesma allowlist do backend, `MIME_VIDEOS` em
 * uploadMiddleware.js). "Documento" não é mais um tipo de anexo de
 * publicação — currículo/certificado continuam existindo como upload
 * separado, fora do composer do feed.
 */
export const TIPOS_VIDEO_ACEITOS = ["video/mp4", "video/webm"];
export const TIPOS_ACEITOS = [...TIPOS_IMAGEM_ACEITOS, ...TIPOS_VIDEO_ACEITOS];
export const MAX_ANEXOS = 4;
export const MAX_CARACTERES = 3000;

export function ehImagem(arquivo: File): boolean {
  return TIPOS_IMAGEM_ACEITOS.includes(arquivo.type);
}

export function ehVideo(arquivo: File): boolean {
  return TIPOS_VIDEO_ACEITOS.includes(arquivo.type);
}
