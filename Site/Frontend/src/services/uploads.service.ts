import api from "./api";
import type { Arquivo } from "@/types";

export type CategoriaUpload =
  | "foto_perfil"
  | "capa_perfil"
  | "logo_empresa"
  | "capa_empresa"
  | "postagem"
  | "curriculo"
  | "certificado"
  | "documento";

/**
 * Uploads (Multer no backend). Imagens: PNG/JPEG/WEBP.
 * Documentos: PDF/DOC/DOCX. Todos ficam registrados na tabela `arquivos`.
 */
export const uploadsService = {
  async enviarDocumento(arquivo: File, categoria: CategoriaUpload = "documento"): Promise<Arquivo> {
    const form = new FormData();
    form.append("arquivo", arquivo);
    form.append("categoria", categoria);

    const { data } = await api.post<{ arquivo: Arquivo }>("/uploads/documento", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.arquivo;
  },
};

/** Converte uma URL relativa (`/uploads/...`) na URL absoluta do backend. */
export function urlArquivo(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/api\/?$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default uploadsService;
