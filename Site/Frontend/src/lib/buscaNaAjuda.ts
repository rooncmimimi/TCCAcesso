/**
 * A busca da Central de Ajuda: simples e tolerante. Ignora acentos e maiúsculas, e exige que todas as
 * palavras digitadas apareçam, em qualquer ordem. "senha esqueci" acha "Esqueci a minha senha".
 */
const ACENTOS = /\p{Diacritic}/gu;

export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(ACENTOS, "").toLowerCase();
}

/** Palavras com uma letra só ("a", "e") não ajudam a achar nada. */
export function palavrasDaBusca(consulta: string): string[] {
  return normalizarBusca(consulta)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 1);
}

export function combinaComABusca(textos: readonly string[], palavras: readonly string[]): boolean {
  const tudo = normalizarBusca(textos.join(" "));
  return palavras.every((palavra) => tudo.includes(palavra));
}
