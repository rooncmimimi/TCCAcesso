/**
 * Tipos do contrato real de mensagens/chat (Site/Backend), conforme
 * auditoria da Fase 17 — `conversaRoutes.js`, `ConversaController`,
 * `MensagemController`, `ConversaService`, `MensagemService`, models
 * `Conversa`/`Mensagem`, e `realtime/socket.js` para os eventos em tempo
 * real. Nomes de campo em português são literais ao que a API/socket envia.
 *
 * IMPORTANTE (achado da auditoria): o model `Conversa` tem um campo
 * `ultimaMensagemPrevia` (pensado para mostrar uma prévia da última
 * mensagem na lista de conversas), mas `ConversaService.enviarMensagem` no
 * backend NUNCA o preenche — só grava `ultimaMensagem` (o timestamp). Na
 * prática esse campo está sempre vazio hoje (confirmado ao vivo), então
 * este app não depende dele para nada visível (nada de "Sem mensagens
 * ainda" fixo à toa) — só usa `ultimaMensagem` (timestamp) e
 * `mensagensNaoLidas`. Documentado como pendência de backend, não corrigido
 * nesta fase (fora do escopo do App).
 */

export interface ParticipanteConversa {
  id: string;
  nome: string;
  fotoPerfil: string | null;
  tipoUsuario: "candidato" | "empresa" | "administrador";
  empresa?: { id: string; nomeFantasia: string | null; razaoSocial: string; logo: string | null } | null;
  [chave: string]: unknown;
}

/** `usuarioAId`/`usuarioBId`/`usuarioA`/`usuarioB` podem ser `null` quando um dos participantes excluiu a conta (migration 0040) — o histórico continua visível, só vira somente-leitura (`ConversaService.enviarMensagem`). */
export interface Conversa {
  id: string;
  usuarioAId: string | null;
  usuarioBId: string | null;
  usuarioA: ParticipanteConversa | null;
  usuarioB: ParticipanteConversa | null;
  ultimaMensagem: string | null;
  mensagensNaoLidas: number;
  created_at: string;
  updated_at: string;
  [chave: string]: unknown;
}

export interface Mensagem {
  id: string;
  conversaId: string;
  remetenteId: string | null;
  conteudo: string;
  lida: boolean;
  lidaEm: string | null;
  created_at: string;
  updated_at: string;
  remetente: { id: string; nome: string; fotoPerfil: string | null } | null;
  [chave: string]: unknown;
}

export interface ListarConversasParametros {
  page?: number;
  limit?: number;
}

/** `GET /conversas` — mesmo envelope de paginação de `/postagens`/`/notificacoes`. */
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

/** `GET /conversas/nao-lidas` — total de MENSAGENS não lidas (não de conversas), usado no selo da aba. */
export interface NaoLidasConversasResposta {
  sucesso: true;
  naoLidas: number;
}

/** `GET /conversas/pode-iniciar/:usuarioId` — consulta que NUNCA lança erro (usada para decidir o estado do botão "Enviar mensagem" antes do clique; a autorização de verdade acontece de novo no `POST /conversas`). */
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

/* ==========================================================
   Eventos de tempo real (Socket.IO) — payloads literais ao que
   `realtime/socket.js` emite (`emitirParaConversa`/`emitirParaUsuario`).
========================================================== */

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
