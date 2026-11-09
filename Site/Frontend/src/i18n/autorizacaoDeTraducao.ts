/**
 * A autorização da pessoa para traduzir por um serviço fora do aparelho.
 *
 * Traduzir por um serviço na internet faz o texto sair do aparelho, e isso não pode acontecer sem a
 * pessoa saber. Ela é perguntada **uma vez**, na primeira tradução que precisaria do serviço, na própria
 * tela, com o que vai acontecer dito por extenso — e a resposta fica guardada neste navegador. Dizer
 * "não" não é um beco: o botão volta ao normal e ela pode pedir de novo quando quiser.
 */

const CHAVE = "acesso:traducao-online-autorizada";

export function autorizouTraducaoOnline(): boolean {
  try {
    return localStorage.getItem(CHAVE) === "sim";
  } catch {
    // Navegação anônima ou armazenamento bloqueado: pergunta de novo, que é o lado seguro.
    return false;
  }
}

export function guardarAutorizacaoDeTraducao(): void {
  try {
    localStorage.setItem(CHAVE, "sim");
  } catch {
    /* Sem onde guardar: a tradução desta vez acontece do mesmo jeito, só não fica lembrada. */
  }
}

/** Só para os testes e para quem quiser ser perguntado de novo. */
export function esquecerAutorizacaoDeTraducao(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* Nada a esquecer. */
  }
}
