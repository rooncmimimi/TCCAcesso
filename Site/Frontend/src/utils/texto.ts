// Sinais diacríticos combinantes (U+0300 a U+036F). Montado por código de caractere, e não como
// intervalo literal no fonte, para o caractere combinante não se perder numa edição do arquivo.
const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

/** Minúsculas e sem acentos, para comparar termos de busca ("São Paulo" encontra "sao paulo"). */
export function normalizarParaBusca(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}
