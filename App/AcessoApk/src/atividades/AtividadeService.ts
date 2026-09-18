import { clienteApi } from "../services/api/cliente";
import type { MinhaAtividade, MinhaAtividadeResposta } from "./types";

/**
 * Resumo da tela "Minha atividade". Não recebe parâmetros: o backend usa a sessão para saber de
 * quem é a atividade.
 */
export const AtividadeService = {
  /** `GET /atividade/minha` (singular, como o backend registra em `routes/index.js`). */
  async minha(): Promise<MinhaAtividade> {
    const { data } = await clienteApi.get<MinhaAtividadeResposta>("/atividade/minha");
    return data.atividade;
  },
};
