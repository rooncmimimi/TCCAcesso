/**
 * Rótulo de um valor que vem do backend como chave (status, tipo de entidade, tipo de usuário…).
 * Um valor que o mapa não conhece aparece como veio, em vez de sumir da tela.
 */
export function rotuloOuValor(mapa: object, chave: string | null | undefined): string {
  if (!chave) return "";
  const rotulo = (mapa as Record<string, unknown>)[chave];
  return typeof rotulo === "string" ? rotulo : chave;
}
