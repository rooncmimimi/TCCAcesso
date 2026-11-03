/**
 * O desafio da verificação por e-mail, entre o login (senha ou Google) e a tela do código.
 *
 * Num aparelho que o servidor não reconhece, a senha certa não abre sessão: abre um desafio de 20 minutos e manda um código de 6
 * números por e-mail (que vale 15). O desafio sozinho não abre nada. Fica no `sessionStorage` (some ao fechar a aba) para a tela
 * do código sobreviver a um F5, e é descartado assim que a sessão abre, que o prazo vence ou que a pessoa desiste.
 */

const CHAVE = "acesso:verificacao-dispositivo";

/** O servidor vale por 20 minutos; aqui um pouco menos, para não oferecer um desafio que já vai falhar. */
export const VALIDADE_DO_DESAFIO_MS = 19 * 60 * 1000;

export type DesafioDeDispositivo = {
  desafio: string;
  emailMascarado: string;
  /** Quantos segundos esperar entre um envio e o próximo. */
  reenvioEmSegundos: number;
  /** Instante (ms) do último envio do código: o relógio do reenvio parte daqui, mesmo depois de um F5. */
  enviadoEm: number;
  /** Instante (ms) em que o desafio foi guardado. */
  em: number;
};

export function guardarVerificacao(
  dados: { desafio: string; emailMascarado: string; reenvioEmSegundos: number },
  agora: number = Date.now(),
): void {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify({ ...dados, enviadoEm: agora, em: agora } satisfies DesafioDeDispositivo));
  } catch {
    // Armazenamento bloqueado: sem ele a tela do código não tem o que usar.
  }
}

/** Depois de um reenvio: o servidor devolve outro desafio, e o relógio da espera recomeça. */
export function renovarVerificacao(dados: { desafio: string; reenvioEmSegundos: number }, agora: number = Date.now()): void {
  const atual = lerVerificacao(agora);
  if (!atual) return;

  guardarVerificacao({ desafio: dados.desafio, emailMascarado: atual.emailMascarado, reenvioEmSegundos: dados.reenvioEmSegundos }, agora);
}

/** O desafio guardado, ou `null` se não há, está corrompido ou venceu (e, nesse caso, já o apaga). */
export function lerVerificacao(agora: number = Date.now()): DesafioDeDispositivo | null {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE);
    if (!bruto) return null;

    const lido = JSON.parse(bruto) as Partial<DesafioDeDispositivo>;

    if (
      typeof lido.desafio !== "string" ||
      typeof lido.emailMascarado !== "string" ||
      typeof lido.reenvioEmSegundos !== "number" ||
      typeof lido.enviadoEm !== "number" ||
      typeof lido.em !== "number" ||
      agora - lido.em > VALIDADE_DO_DESAFIO_MS
    ) {
      limparVerificacao();
      return null;
    }

    return lido as DesafioDeDispositivo;
  } catch {
    limparVerificacao();
    return null;
  }
}

export function limparVerificacao(): void {
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    // Nada a limpar se o armazenamento não está disponível.
  }
}

/** Quantos segundos faltam para poder pedir outro código (0 = já pode). */
export function segundosParaReenviar(verificacao: Pick<DesafioDeDispositivo, "enviadoEm" | "reenvioEmSegundos">, agora: number = Date.now()): number {
  return Math.max(0, Math.ceil(verificacao.reenvioEmSegundos - (agora - verificacao.enviadoEm) / 1000));
}
