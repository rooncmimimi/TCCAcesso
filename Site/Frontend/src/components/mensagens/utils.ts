import type { Conversa, ParticipanteConversa } from "@/lib/api-types";

/** Retorna o participante "do outro lado" da conversa em relação ao usuário logado. */
export function participanteOposto(conversa: Conversa, usuarioId: string | null): ParticipanteConversa | undefined {
  if (!usuarioId) return conversa.usuarioA ?? conversa.usuarioB;
  if (conversa.usuarioA?.id === usuarioId) return conversa.usuarioB;
  if (conversa.usuarioB?.id === usuarioId) return conversa.usuarioA;
  return conversa.usuarioA ?? conversa.usuarioB;
}

/**
 * Fase 8: quando o participante do outro lado excluiu a conta, o backend
 * devolve `usuarioA`/`usuarioB` como `null` (histórico preservado, ver
 * migration 0040) — o fallback final passa a ser "Usuário removido" em vez
 * de "Contato", que sugeria só um cadastro incompleto.
 */
export function nomeParticipante(participante?: ParticipanteConversa): string {
  return (
    participante?.empresa?.nomeFantasia ||
    participante?.empresa?.razaoSocial ||
    participante?.nome ||
    "Usuário removido"
  );
}

export function fotoParticipante(participante?: ParticipanteConversa): string | null {
  return participante?.empresa?.logo || participante?.fotoPerfil || null;
}

export function formatarHora(data?: string): string {
  if (!data) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(data));
  } catch {
    return "";
  }
}

export function formatarDataRelativa(data?: string): string {
  if (!data) return "";
  const alvo = new Date(data);
  const agora = new Date();
  const mesmoDia = alvo.toDateString() === agora.toDateString();
  if (mesmoDia) return formatarHora(data);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(alvo);
}
