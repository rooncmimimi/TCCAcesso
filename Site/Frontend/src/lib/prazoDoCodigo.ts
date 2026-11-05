/**
 * Prazo do código enviado por e-mail, para quem precisa de mais tempo para ler, achar o e-mail e
 * digitar. O prazo é o do servidor; aqui só se calcula e se avisa, sem encurtar nem estender nada.
 *
 * Quando o horário de envio é conhecido, a tela mostra *até que horas* o código vale (um horário
 * fixo, sem contagem regressiva correndo na cara da pessoa) e só avisa quando faltam poucos minutos.
 */

/** O código por e-mail da verificação de dispositivo vale 15 minutos (`MINUTOS_VALIDADE_EMAIL`, no servidor). */
export const MINUTOS_DE_VALIDADE_DO_CODIGO = 15;

/** Quanto antes do fim a tela avisa. */
export const MINUTOS_DE_AVISO = 3;

export type SituacaoDoPrazo = "folga" | "acabando" | "venceu";

export function venceEm(enviadoEm: number, minutos: number = MINUTOS_DE_VALIDADE_DO_CODIGO): number {
  return enviadoEm + minutos * 60_000;
}

export function situacaoDoPrazo(enviadoEm: number, agora: number, minutos: number = MINUTOS_DE_VALIDADE_DO_CODIGO): SituacaoDoPrazo {
  const falta = venceEm(enviadoEm, minutos) - agora;
  if (falta <= 0) return "venceu";
  if (falta <= MINUTOS_DE_AVISO * 60_000) return "acabando";
  return "folga";
}

/** "14:32", no formato do idioma da pessoa. */
export function horaDoVencimento(enviadoEm: number, locale: string, minutos: number = MINUTOS_DE_VALIDADE_DO_CODIGO): string {
  return new Date(venceEm(enviadoEm, minutos)).toLocaleTimeString(locale || "pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Minutos que faltam, arredondando para cima ("faltam 3 minutos" enquanto restar qualquer parte do terceiro). */
export function minutosQueFaltam(enviadoEm: number, agora: number, minutos: number = MINUTOS_DE_VALIDADE_DO_CODIGO): number {
  return Math.max(0, Math.ceil((venceEm(enviadoEm, minutos) - agora) / 60_000));
}
