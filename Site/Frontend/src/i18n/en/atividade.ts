import type { Dicionario } from "../dicionario";

export const atividade: Dicionario["atividade"] = {
  meta: {
    titulo: "My activity — ACESSO",
    descricao: "See, for your eyes only, a summary of your applications, saved jobs, follows and feed interactions.",
  },
  titulo: "My activity",
  intro: "A summary of your presence on ACESSO. This page is private — only you can see it.",
  carregando: "Loading your activity…",
  erro: "We couldn't load your activity.",
  pessoasSeguidas: "People you follow",
  verTudo: "See all",
  nenhumaPessoa: "You aren't following anyone yet.",
  verFeed: "Go to the feed",
  empresasSeguidas: "Companies you follow",
  nenhumaEmpresa: "You aren't following any company yet.",
  explorarVagas: "Browse jobs",
  empresaFallback: "Company",
  interacoes: "Your feed interactions",
  curtidas: "Likes",
  comentarios: "Comments",
  compartilhamentos: "Shares",
  semCurtidas: "You haven't liked any post yet.",
  semComentarios: "You haven't commented on any post yet.",
  semCompartilhamentos: "You haven't shared any post yet.",
  publicacaoComAnexo: "Post with attachment",
};
