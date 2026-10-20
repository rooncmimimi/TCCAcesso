import type { Dicionario } from "../dicionario";

export const erros: Dicionario["erros"] = {
  naoEncontrada: {
    titulo: "Página no encontrada",
    texto: "La página que buscas no existe o fue movida.",
    voltar: "Volver al inicio",
  },
  falhaDePagina: {
    titulo: "Esta página no se cargó",
    texto: "Algo salió mal de nuestro lado. Puedes intentarlo de nuevo o volver al inicio.",
    tentar: "Intentar de nuevo",
    inicio: "Ir al inicio",
  },
};
