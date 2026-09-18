/**
 * Tipos do chat espelhando exatamente o que o backend Express devolve
 * (models Conversa/Mensagem com timestamps `criadoEm`/`atualizadoEm`).
 */

export interface ParticipanteConversa {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario?: "candidato" | "empresa" | "administrador";
  /** Nome de exibição preferido, preenchido só quando o participante é uma empresa. */
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
  ultimaMensagemEm?: string | null;
  /** Prévia textual da última mensagem, quando disponível. */
  ultimaMensagemPrevia?: string | null;
  mensagensNaoLidas?: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Mensagem {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  lida?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
  remetente?: {
    id: string;
    nome: string;
    fotoPerfil?: string | null;
  };
}

/** Data de criação de um registro da API. */
export function criadoEmDe(registro: { criadoEm?: string }): string | undefined {
  return registro.criadoEm;
}
