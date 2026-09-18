import { clienteApi } from "../services/api/cliente";
import type {
  AtualizarPreferenciaMensagensResposta,
  AtualizarPrivacidadeResposta,
  PreferenciaMensagens,
  PreferenciasNotificacao,
  PreferenciasNotificacaoDados,
  PreferenciasNotificacaoResposta,
} from "./types";

/** Privacidade do perfil, quem pode enviar mensagens e preferências de notificação da conta. */
export const ConfiguracoesService = {
  /** `PUT /usuarios/privacidade`. */
  async atualizarPrivacidade(perfilPublico: boolean): Promise<boolean> {
    const { data } = await clienteApi.put<AtualizarPrivacidadeResposta>("/usuarios/privacidade", { perfilPublico });
    return data.perfilPublico;
  },

  /** `PUT /usuarios/privacidade/mensagens`. */
  async atualizarPreferenciaMensagens(preferencia: PreferenciaMensagens): Promise<PreferenciaMensagens> {
    const { data } = await clienteApi.put<AtualizarPreferenciaMensagensResposta>("/usuarios/privacidade/mensagens", {
      preferenciaMensagens: preferencia,
    });
    return data.preferenciaMensagens;
  },

  /** `GET /notificacoes/preferencias`: `findOrCreate` no backend, sempre devolve um registro (nunca 404). */
  async obterPreferenciasNotificacao(): Promise<PreferenciasNotificacao> {
    const { data } = await clienteApi.get<PreferenciasNotificacaoResposta>("/notificacoes/preferencias");
    return data.preferencias;
  },

  /** `PUT /notificacoes/preferencias`: envia só os campos que mudaram. */
  async atualizarPreferenciasNotificacao(dados: PreferenciasNotificacaoDados): Promise<PreferenciasNotificacao> {
    const { data } = await clienteApi.put<PreferenciasNotificacaoResposta>("/notificacoes/preferencias", dados);
    return data.preferencias;
  },
};
