import type { Dicionario } from "../dicionario";

export const busca: Dicionario["busca"] = {
  abrirAria: "Search people, companies or jobs on ACESSO",
  placeholder: "Search people, companies or jobs…",
  termoAria: "Search term",
  recentes: "Recent searches",
  minimoCaracteres: "Type at least 2 characters to search.",
  erro: "We couldn't search right now.",
  semResultados: (termo) =>
    `No results for "${termo}". Try another name, company, job or keyword.`,
  pessoas: "People",
  empresas: "Companies",
  vagas: "Jobs",
  publicacoes: "Posts",
};
