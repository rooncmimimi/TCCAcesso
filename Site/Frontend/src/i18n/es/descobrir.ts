import type { Dicionario } from "../dicionario";

export const descobrir: Dicionario["descobrir"] = {
  meta: {
    titulo: "Descubrir — ACESSO",
    descricao: "Encuentra personas y empresas para seguir en ACESSO, con sugerencias explicadas.",
  },
  titulo: "Descubrir",
  intro:
    "Sugerencias de personas y empresas para seguir. Cada sugerencia explica por qué apareció: nunca usamos la discapacidad, un diagnóstico u otro dato sensible como criterio.",
  pessoas: "Personas",
  empresas: "Empresas",
  carregandoPessoas: "Buscando personas que quizá quieras conocer…",
  carregandoEmpresas: "Buscando empresas que quizá quieras conocer…",
  erro: "No se pudieron cargar las sugerencias.",
  vazioPessoas: "No hay sugerencias de personas por ahora. Interactúa más en el feed para recibir mejores sugerencias.",
  vazioEmpresas: "No hay sugerencias de empresas por ahora. Guarda vacantes como favoritas para recibir mejores sugerencias.",
  verPerfilDe: (nome) => `Ver el perfil de ${nome}`,
  empresaFallback: "Empresa",
  seguir: "Seguir",
  seguindoAgora: (nome) => `Ahora sigues a ${nome}.`,
  erroSeguir: "No se pudo seguir a esta empresa.",
};
