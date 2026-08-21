import type { Conversa, ParticipanteConversa } from "@/lib/api-types";

/** Retorna o participante "do outro lado" da conversa em relação ao usuário logado. */
export function participanteOposto(conversa: Conversa, usuarioId: string | null): ParticipanteConversa | undefined {
  if (!usuarioId) return conversa.empresa ?? conversa.candidato;
  if (conversa.candidato?.usuarioId === usuarioId) return conversa.empresa;
  if (conversa.empresa?.usuarioId === usuarioId) return conversa.candidato;
  return conversa.empresa ?? conversa.candidato;
}

export function nomeParticipante(participante?: ParticipanteConversa): string {
  return participante?.nomeFantasia || participante?.razaoSocial || participante?.usuario?.nome || "Contato";
}

export function fotoParticipante(participante?: ParticipanteConversa): string | null {
  return participante?.logo || participante?.usuario?.fotoPerfil || null;
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
