import type { Dicionario } from "../dicionario";

export const busca: Dicionario["busca"] = {
  abrirAria: "Buscar personas, empresas o vacantes en ACESSO",
  placeholder: "Buscar personas, empresas o vacantes…",
  termoAria: "Término de búsqueda",
  recentes: "Búsquedas recientes",
  minimoCaracteres: "Escribe al menos 2 caracteres para buscar.",
  erro: "No fue posible buscar ahora.",
  semResultados: (termo) =>
    `No encontramos resultados para "${termo}". Prueba con otro nombre, empresa, vacante o palabra clave.`,
  pessoas: "Personas",
  empresas: "Empresas",
  vagas: "Vacantes",
  publicacoes: "Publicaciones",
};
