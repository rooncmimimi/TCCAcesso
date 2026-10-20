/** Página "Descobrir": sugestões de pessoas e empresas para seguir. */
export const descobrir = {
  meta: {
    titulo: "Descobrir — ACESSO",
    descricao: "Encontre pessoas e empresas para seguir no ACESSO, com sugestões explicadas.",
  },
  titulo: "Descobrir",
  intro:
    "Sugestões de pessoas e empresas para seguir. Cada sugestão explica por que ela apareceu — nunca usamos deficiência, diagnóstico ou outro dado sensível como critério.",
  pessoas: "Pessoas",
  empresas: "Empresas",
  carregandoPessoas: "Procurando pessoas para você conhecer…",
  carregandoEmpresas: "Procurando empresas para você conhecer…",
  erro: "Não foi possível carregar as sugestões.",
  vazioPessoas: "Sem sugestões de pessoas no momento. Interaja mais no feed para receber sugestões melhores.",
  vazioEmpresas: "Sem sugestões de empresas no momento. Favorite vagas para receber sugestões melhores.",
  verPerfilDe: (nome: string) => `Ver perfil de ${nome}`,
  empresaFallback: "Empresa",
  seguir: "Seguir",
  seguindoAgora: (nome: string) => `Agora você está seguindo ${nome}.`,
  erroSeguir: "Não foi possível seguir esta empresa.",
};
