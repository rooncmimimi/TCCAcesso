/**
 * Tipos do chat espelhando EXATAMENTE o que o backend Express devolve
 * (models Conversa/Mensagem com timestamps `created_at`/`updated_at`).
 */

export interface ParticipanteConversa {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario?: "candidato" | "empresa" | "administrador";
  /** Preenchido só quando o participante é uma empresa — nome de exibição preferido. */
  empresa?: {
    id: string;
    nomeFantasia?: string | null;
    razaoSocial?: string | null;
    logo?: string | null;
  } | null;
}

export interface Conversa {
  id: string;
  usuarioAId?: string;
  usuarioBId?: string;
  usuarioA?: ParticipanteConversa;
  usuarioB?: ParticipanteConversa;
  /** Data/hora da última mensagem (o backend grava um timestamp aqui). */
  ultimaMensagem?: string | null;
  ultimaMensagemEm?: string | null;
  /** Prévia textual da última mensagem, quando disponível. */
  ultimaMensagemPrevia?: string | null;
  mensagensNaoLidas?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Mensagem {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  lida?: boolean;
  lidaEm?: string | null;
  created_at?: string;
  updated_at?: string;
  remetente?: {
    id: string;
    nome: string;
    fotoPerfil?: string | null;
  };
}

/** Data de criação, independente do formato devolvido pela API. */
export function criadoEmDe(registro: { created_at?: string; criadoEm?: string }): string | undefined {
  return registro.created_at ?? registro.criadoEm;
}
