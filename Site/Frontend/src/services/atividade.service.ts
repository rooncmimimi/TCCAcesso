import api from "./api";
import type { AtividadePessoal } from "@/types";

/** "Minha atividade" — sempre a do próprio usuário autenticado (nunca recebe um id). */
export const atividadeService = {
  async minha(): Promise<AtividadePessoal> {
    const { data } = await api.get<{ atividade: AtividadePessoal }>("/atividade/minha");
    return data.atividade;
  },
};

export default atividadeService;
