import type { Dicionario } from "../dicionario";

export const erros: Dicionario["erros"] = {
  naoEncontrada: {
    titulo: "Page not found",
    texto: "The page you are looking for does not exist or has been moved.",
    voltar: "Back to home",
  },
  falhaDePagina: {
    titulo: "This page did not load",
    texto: "Something went wrong on our side. You can try again or go back to the home page.",
    tentar: "Try again",
    inicio: "Go to home",
  },
};
