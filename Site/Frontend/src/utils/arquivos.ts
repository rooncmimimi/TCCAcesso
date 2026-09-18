/**
 * Converte o valor de arquivo devolvido pela API na URL que o navegador abre.
 *
 * Anexo de publicação e currículo já chegam como URL assinada e passam direto. Foto, capa e logo
 * chegam resolvidas pelo backend; em desenvolvimento sem Supabase Storage, elas vêm como caminho
 * relativo (`/uploads/...`) e ganham aqui o endereço do servidor.
 */
export function urlArquivo(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/api\/?$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}
