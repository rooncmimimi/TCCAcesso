/**
 * Lembra em qual etapa do assistente de cadastro a pessoa está, para atualizar a página (F5) não
 * mandá-la de volta a uma etapa anterior.
 *
 * Fica no `sessionStorage` (vale só para esta aba, some ao fechá-la) e é amarrado ao `id` do usuário:
 * outra conta no mesmo navegador nunca herda a etapa de quem estava antes. Todo acesso ao storage é
 * protegido, porque ele pode estar bloqueado (modo privado, política do navegador) e o cadastro
 * precisa funcionar do mesmo jeito sem ele.
 */

const CHAVE = "acesso:cadastro:etapa";

type Registro = { usuarioId: string; passo: number };

export function lerEtapaSalva(usuarioId: string): number | null {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE);
    if (!bruto) return null;

    const registro = JSON.parse(bruto) as Partial<Registro>;

    return registro.usuarioId === usuarioId && Number.isInteger(registro.passo) ? (registro.passo as number) : null;
  } catch {
    return null;
  }
}

export function salvarEtapa(usuarioId: string, passo: number): void {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify({ usuarioId, passo } satisfies Registro));
  } catch {
    // Sem storage, o cadastro segue; só não lembra a etapa depois de atualizar a página.
  }
}

export function limparEtapa(): void {
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer.
  }
}
