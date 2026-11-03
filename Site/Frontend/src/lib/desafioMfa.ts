/**
 * O desafio do segundo fator, entre o login (senha ou Google) e a tela do código.
 *
 * Depois da senha, quem tem verificação em duas etapas recebe do servidor um desafio de 5 minutos em vez
 * da sessão. Ele sozinho não abre nada: só serve para `POST /auth/login/totp`, junto do código. Fica no
 * `sessionStorage` (some ao fechar a aba) para a tela do código sobreviver a um F5, e é descartado assim
 * que a sessão abre, que o prazo vence ou que a pessoa desiste.
 */

const CHAVE = "acesso:mfa-desafio";

/** O servidor vale por 5 minutos; aqui um pouco menos, para não oferecer um desafio que já vai falhar. */
export const VALIDADE_DO_DESAFIO_MS = 4.5 * 60 * 1000;

export type DesafioMfa = {
  desafio: string;
  /** Instante (ms) em que foi guardado. */
  em: number;
};

export function guardarDesafio(desafio: string, agora: number = Date.now()): void {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify({ desafio, em: agora } satisfies DesafioMfa));
  } catch {
    // Armazenamento bloqueado (janela privada restrita): sem ele a tela do código não tem o que usar.
  }
}

/** O desafio guardado, ou `null` se não há, está corrompido ou venceu (e, nesse caso, já o apaga). */
export function lerDesafio(agora: number = Date.now()): DesafioMfa | null {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE);
    if (!bruto) return null;

    const lido = JSON.parse(bruto) as Partial<DesafioMfa>;

    if (typeof lido.desafio !== "string" || typeof lido.em !== "number" || agora - lido.em > VALIDADE_DO_DESAFIO_MS) {
      limparDesafio();
      return null;
    }

    return { desafio: lido.desafio, em: lido.em };
  } catch {
    limparDesafio();
    return null;
  }
}

export function limparDesafio(): void {
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    // Nada a limpar se o armazenamento não está disponível.
  }
}
