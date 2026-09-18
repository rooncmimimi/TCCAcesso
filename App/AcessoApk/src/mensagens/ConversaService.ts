import { clienteApi } from "../services/api/cliente";
import type {
  AbrirConversaDados,
  Conversa,
  ConversaDetalheResposta,
  EnviarMensagemResposta,
  ListaConversasResposta,
  ListaMensagensResposta,
  ListarConversasParametros,
  ListarMensagensParametros,
  Mensagem,
  NaoLidasConversasResposta,
  PodeIniciarConversaResposta,
} from "./types";

/**
 * Chamadas de conversas e mensagens. O tempo real pelo Socket.IO só complementa: tudo aqui funciona
 * sem ele (ver `services/socket/socketClient.ts`).
 */
export const ConversaService = {
  /** `GET /conversas`: mais recentes primeiro (por `ultimaMensagemEm`). */
  async listar(parametros: ListarConversasParametros = {}): Promise<ListaConversasResposta> {
    const { data } = await clienteApi.get<ListaConversasResposta>("/conversas", { params: parametros });
    return data;
  },

  /** `POST /conversas`: abre uma conversa nova ou devolve a já existente com esse usuário (o backend nunca duplica). */
  async abrir(dados: AbrirConversaDados): Promise<Conversa> {
    const { data } = await clienteApi.post<ConversaDetalheResposta>("/conversas", dados);
    return data.conversa;
  },

  /** `GET /conversas/:id`. */
  async obterPorId(id: string): Promise<Conversa> {
    const { data } = await clienteApi.get<ConversaDetalheResposta>(`/conversas/${id}`);
    return data.conversa;
  },

  /** `GET /conversas/nao-lidas`: usado pelo selo (badge) da aba. */
  async contarNaoLidas(): Promise<number> {
    const { data } = await clienteApi.get<NaoLidasConversasResposta>("/conversas/nao-lidas");
    return data.naoLidas;
  },

  /** `GET /conversas/pode-iniciar/:usuarioId`: nunca lança 4xx; usada para decidir o estado do botão "Enviar mensagem" antes do toque. */
  async podeIniciar(usuarioId: string): Promise<{ permitido: boolean; motivo?: string }> {
    const { data } = await clienteApi.get<PodeIniciarConversaResposta>(`/conversas/pode-iniciar/${usuarioId}`);
    return { permitido: data.permitido, motivo: data.motivo };
  },

  /** `GET /conversas/:conversaId/mensagens`: mais antigas primeiro (ordem de leitura natural do chat). */
  async listarMensagens(conversaId: string, parametros: ListarMensagensParametros = {}): Promise<ListaMensagensResposta> {
    const { data } = await clienteApi.get<ListaMensagensResposta>(`/conversas/${conversaId}/mensagens`, {
      params: parametros,
    });
    return data;
  },

  /** `POST /conversas/:conversaId/mensagens`. */
  async enviarMensagem(conversaId: string, conteudo: string): Promise<Mensagem> {
    const { data } = await clienteApi.post<EnviarMensagemResposta>(`/conversas/${conversaId}/mensagens`, { conteudo });
    return data.mensagem;
  },

  /** `PATCH /conversas/:conversaId/mensagens/lidas`: marca todas as mensagens não lidas da conversa (que não são minhas) de uma vez. */
  async marcarComoLidas(conversaId: string): Promise<void> {
    await clienteApi.patch(`/conversas/${conversaId}/mensagens/lidas`);
  },
};
