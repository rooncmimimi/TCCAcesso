import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Preferências de segurança deste aparelho, no `AsyncStorage`. O bloqueio por biometria é uma
 * escolha local e não vai para o servidor: trocar de aparelho não deve herdar essa configuração (as
 * preferências da conta ficam no `ConfiguracoesService`). Segue o mesmo padrão de JSON único de
 * `acessibilidade/armazenamentoAcessibilidade.ts`.
 */
const CHAVE_PREFERENCIAS = "acesso.segurancaPreferences";

interface PreferenciasSeguranca {
  bloqueioBiometricoAtivo: boolean;
}

/** Nunca lança: falha ao ler vira "desativado" (a opção mais segura por padrão: nunca trava alguém pra fora sozinha). */
export async function obterBloqueioBiometricoAtivo(): Promise<boolean> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_PREFERENCIAS);
    if (!bruto) return false;
    const preferencias = JSON.parse(bruto) as Partial<PreferenciasSeguranca>;
    return preferencias.bloqueioBiometricoAtivo === true;
  } catch {
    return false;
  }
}

/** Também nunca lança: mesma razão de `armazenamentoAcessibilidade.salvarPreferencias`. */
export async function definirBloqueioBiometricoAtivo(valor: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ bloqueioBiometricoAtivo: valor }));
  } catch {
    // Silencioso de propósito (ver comentário acima).
  }
}
