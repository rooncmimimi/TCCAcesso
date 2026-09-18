/**
 * Tipos de conversas e mensagens, incluindo os eventos de tempo real de `realtime/socket.js`.
 *
 * A lista de conversas mostra o começo da última mensagem (`ultimaMensagemPrevia`), o horário dela
 * (`ultimaMensagemEm`) e `mensagensNaoLidas`. Os dois primeiros são atualizados a cada envio por
 * `ConversaService.enviarMensagem`, no backend.
 */

export interface ParticipanteConversa {
  id: string;
  nome: string;
  fotoPerfil: string | null;
  tipoUsuario: "candidato" | "empresa" | "administrador";
  empresa?: { id: string; nomeFantasia: string | null; razaoSocial: string; logo: string | null } | null;
  [chave: string]: unknown;
}

/** `usuarioAId`/`usuarioBId`/`usuarioA`/`usuarioB` podem ser `null` quando um dos participantes excluiu a conta: o histórico continua visível, só vira somente-leitura (`ConversaService.enviarMensagem`). */
export interface Conversa {
  id: string;
  usuarioAId: string | null;
  usuarioBId: string | null;
  usuarioA: ParticipanteConversa | null;
  usuarioB: ParticipanteConversa | null;
  ultimaMensagemEm: string | null;
  /** Começo do texto da última mensagem (180 caracteres, cortados pelo backend). */
  ultimaMensagemPrevia: string | null;
  mensagensNaoLidas: number;
  criadoEm: string;
  atualizadoEm: string;
  [chave: string]: unknown;
}

export interface Mensagem {
  id: string;
  conversaId: string;
  remetenteId: string | null;
  conteudo: string;
  lida: boolean;
  criadoEm: string;
  atualizadoEm: string;
  remetente: { id: string; nome: string; fotoPerfil: string | null } | null;
  [chave: string]: unknown;
}

export interface ListarConversasParametros {
  page?: number;
  limit?: number;
}

/** `GET /conversas`: mesmo envelope de paginação de `/postagens`/`/notificacoes`. */
export interface ListaConversasResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  conversas: Conversa[];
}

/** `POST /conversas`. */
export interface AbrirConversaDados {
  usuarioId: string;
}

export interface ConversaDetalheResposta {
  sucesso: true;
  conversa: Conversa;
}

/** `GET /conversas/nao-lidas`: total de mensagens não lidas (não de conversas), usado no selo da aba. */
export interface NaoLidasConversasResposta {
  sucesso: true;
  naoLidas: number;
}

/** `GET /conversas/pode-iniciar/:usuarioId`: consulta que nunca lança erro (usada para decidir o estado do botão "Enviar mensagem" antes do clique; a autorização de verdade acontece de novo no `POST /conversas`). */
export interface PodeIniciarConversaResposta {
  sucesso: true;
  permitido: boolean;
  motivo?: string;
  codigo?: number;
}

export interface ListarMensagensParametros {
  page?: number;
  limit?: number;
}

export interface ListaMensagensResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  mensagens: Mensagem[];
}

export interface EnviarMensagemResposta {
  sucesso: true;
  mensagem: Mensagem;
}

/*
 * Eventos de tempo real (Socket.IO), no formato emitido por `realtime/socket.js`
 * (`emitirParaConversa` e `emitirParaUsuario`).
 */

export interface MensagemNovaEvento {
  conversaId: string;
  mensagem: Mensagem;
}

export interface ConversaAtualizadaEvento {
  conversaId: string;
}

export interface MensagemLidaEvento {
  conversaId: string;
  usuarioId: string;
}

export interface MensagemDigitandoEvento {
  conversaId: string;
  usuarioId: string;
  digitando: boolean;
}
