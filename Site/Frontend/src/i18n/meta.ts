/**
 * Metadados de página (título e descrição) a partir dos textos do dicionário. Usado no `head` das
 * rotas, que roda fora de componentes: o roteador é invalidado quando o idioma muda, e o `head`
 * volta a ser calculado com o idioma novo.
 */
export function metaPagina(m: { titulo: string; descricao?: string }) {
  return {
    meta: [
      { title: m.titulo },
      ...(m.descricao ? [{ name: "description", content: m.descricao }] : []),
      { property: "og:title", content: m.titulo },
      ...(m.descricao ? [{ property: "og:description", content: m.descricao }] : []),
    ],
  };
}
