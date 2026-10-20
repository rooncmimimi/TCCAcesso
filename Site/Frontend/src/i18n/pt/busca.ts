/** Busca global do cabeçalho. */
export const busca = {
  abrirAria: "Pesquisar pessoas, empresas ou vagas no ACESSO",
  placeholder: "Pesquisar pessoas, empresas ou vagas…",
  termoAria: "Termo de pesquisa",
  recentes: "Buscas recentes",
  minimoCaracteres: "Digite ao menos 2 caracteres para pesquisar.",
  erro: "Não foi possível pesquisar agora.",
  semResultados: (termo: string) =>
    `Não encontramos resultados para "${termo}". Tente pesquisar por outro nome, empresa, vaga ou palavra-chave.`,
  pessoas: "Pessoas",
  empresas: "Empresas",
  vagas: "Vagas",
  publicacoes: "Publicações",
};
