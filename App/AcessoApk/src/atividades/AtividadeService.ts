import { apiClient } from "../services/api/client";
import type { MinhaAtividade, MinhaAtividadeResposta } from "./types";

/**
 * Única camada que conhece o endpoint real de "Minha atividade"
 * (`Site/Backend/src/routes/atividadeRoutes.js`, confirmado por auditoria).
 * Um único método, sem parâmetro — todo o escopo vem da sessão autenticada
 * no backend. Nenhum método trata 401 por conta própria (mesma regra de
 * `VagasService`/`SeguidorService`).
 */
export const AtividadeService = {
  /** `GET /atividades/minha`. */
  async minha(): Promise<MinhaAtividade> {
    const { data } = await apiClient.get<MinhaAtividadeResposta>("/atividades/minha");
    return data.atividade;
  },
};
