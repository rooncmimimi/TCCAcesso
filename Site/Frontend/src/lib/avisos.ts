/**
 * Quanto um aviso fica na tela com a opção "Manter avisos na tela até eu fechar". A pessoa fecha
 * quando quiser; o limite existe para que uma mensagem sensível (bloqueio de conta, erro com dados)
 * não fique indefinidamente numa tela que alguém mais pode ver depois.
 */
export const DURACAO_MAXIMA_DO_AVISO = 5 * 60 * 1000;

/** Duração padrão do `sonner` quando a preferência está desligada. */
export const DURACAO_PADRAO_DO_AVISO = 4000;

/**
 * Duração de um aviso que já tem tempo próprio (como o de conta bloqueada, que fica 10 s): com a
 * preferência ligada vira `DURACAO_MAXIMA_DO_AVISO`, nunca menos que o tempo próprio.
 */
export function duracaoDoAviso(proprio: number, persistir: boolean): number {
  return persistir ? Math.max(proprio, DURACAO_MAXIMA_DO_AVISO) : proprio;
}
