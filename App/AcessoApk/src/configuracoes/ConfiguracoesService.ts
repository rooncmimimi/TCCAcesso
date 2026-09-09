import { apiClient } from "../services/api/client";
import type {
  AtualizarPreferenciaMensagensResposta,
  AtualizarPrivacidadeResposta,
  PreferenciaMensagens,
  PreferenciasNotificacao,
  PreferenciasNotificacaoDados,
  PreferenciasNotificacaoResposta,
} from "./types";

/**
 * Única camada que conhece os endpoints reais de privacidade/notificação
 * (`Site/Backend/src/routes/usuarioRoutes.js`, `notificacaoRoutes.js`,
 * confirmado por auditoria). Todo path/payload/resposta é literal ao que o
 * backend expõe hoje.
 */
export const ConfiguracoesService = {
  /** `PUT /usuarios/privacidade`. */
  async atualizarPrivacidade(perfilPublico: boolean): Promise<boolean> {
    const { data } = await apiClient.put<AtualizarPrivacidadeResposta>("/usuarios/privacidade", { perfilPublico });
    return data.perfilPublico;
  },

  /** `PUT /usuarios/privacidade/mensagens`. */
  async atualizarPreferenciaMensagens(preferencia: PreferenciaMensagens): Promise<PreferenciaMensagens> {
    const { data } = await apiClient.put<AtualizarPreferenciaMensagensResposta>("/usuarios/privacidade/mensagens", {
      preferenciaMensagens: preferencia,
    });
    return data.preferenciaMensagens;
  },

  /** `GET /notificacoes/preferencias` — `findOrCreate` no backend, sempre devolve um registro (nunca 404). */
  async obterPreferenciasNotificacao(): Promise<PreferenciasNotificacao> {
    const { data } = await apiClient.get<PreferenciasNotificacaoResposta>("/notificacoes/preferencias");
    return data.preferencias;
  },

  /** `PUT /notificacoes/preferencias` — envia só os campos que mudaram. */
  async atualizarPreferenciasNotificacao(dados: PreferenciasNotificacaoDados): Promise<PreferenciasNotificacao> {
    const { data } = await apiClient.put<PreferenciasNotificacaoResposta>("/notificacoes/preferencias", dados);
    return data.preferencias;
  },
};
