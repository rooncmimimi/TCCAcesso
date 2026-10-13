/**
 * Monta o `aria-describedby` de um campo do cadastro a partir do `id` dele.
 *
 * Fica num arquivo próprio (e não dentro de `Campo.tsx`) porque é função, não componente, e os ids
 * que ela devolve precisam casar exatamente com os que `Campo` escreve no erro (`<id>-erro`) e na
 * caixa de ajuda (`<id>-ajuda`). A ordem importa: o leitor de tela lê na ordem em que os ids são
 * citados, e o erro vem antes da explicação.
 */
export function descricao(id: string, temAjuda: boolean, temErro: boolean): string | undefined {
  const ids = [temErro ? `${id}-erro` : null, temAjuda ? `${id}-ajuda` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}
