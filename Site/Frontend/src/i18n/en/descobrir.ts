import type { Dicionario } from "../dicionario";

export const descobrir: Dicionario["descobrir"] = {
  meta: {
    titulo: "Discover — ACESSO",
    descricao: "Find people and companies to follow on ACESSO, with explained suggestions.",
  },
  titulo: "Discover",
  intro:
    "Suggestions of people and companies to follow. Each suggestion explains why it appeared — we never use disability, diagnosis or any other sensitive data as a criterion.",
  pessoas: "People",
  empresas: "Companies",
  carregandoPessoas: "Looking for people you may want to meet…",
  carregandoEmpresas: "Looking for companies you may want to meet…",
  erro: "We couldn't load the suggestions.",
  vazioPessoas: "No people suggestions right now. Interact more in the feed to get better suggestions.",
  vazioEmpresas: "No company suggestions right now. Save jobs to get better suggestions.",
  verPerfilDe: (nome) => `View ${nome}'s profile`,
  empresaFallback: "Company",
  seguir: "Follow",
  seguindoAgora: (nome) => `You are now following ${nome}.`,
  erroSeguir: "We couldn't follow this company.",
};
