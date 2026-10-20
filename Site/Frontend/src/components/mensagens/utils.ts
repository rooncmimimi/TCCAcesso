import { dic } from "@/i18n";
import type { Conversa, ParticipanteConversa } from "@/lib/tiposApi";
import { formatarDiaMes, formatarHoraCurta } from "@/utils/formatacao";

/** Retorna o participante "do outro lado" da conversa em relação ao usuário logado. */
export function participanteOposto(conversa: Conversa, usuarioId: string | null): ParticipanteConversa | undefined {
  if (!usuarioId) return conversa.usuarioA ?? conversa.usuarioB;
  if (conversa.usuarioA?.id === usuarioId) return conversa.usuarioB;
  if (conversa.usuarioB?.id === usuarioId) return conversa.usuarioA;
  return conversa.usuarioA ?? conversa.usuarioB;
}

/**
 * Quando o outro participante excluiu a conta, o backend devolve `usuarioA` ou `usuarioB` como
 * `null` (o histórico fica preservado), e o nome exibido vira "Usuário removido".
 */
export function nomeParticipante(participante?: ParticipanteConversa): string {
  return (
    participante?.empresa?.nomeFantasia ||
    participante?.empresa?.razaoSocial ||
    participante?.nome ||
    dic().mensagens.usuarioRemovido
  );
}

export function fotoParticipante(participante?: ParticipanteConversa): string | null {
  return participante?.empresa?.logo || participante?.fotoPerfil || null;
}

export function formatarHora(data?: string): string {
  if (!data) return "";
  try {
    return formatarHoraCurta(data);
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
  return formatarDiaMes(alvo);
}
