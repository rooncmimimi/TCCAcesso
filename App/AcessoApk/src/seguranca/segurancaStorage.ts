import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Único lugar do app que fala com o `AsyncStorage` para preferências de
 * segurança do APARELHO (não da conta — isso já é `ConfiguracoesService`,
 * sincronizado com o backend). "Ativar bloqueio por biometria" é uma
 * escolha local, do mesmo aparelho, que nunca faz sentido persistir no
 * servidor (trocar de aparelho não deveria "herdar" essa preferência) —
 * mesmo raciocínio de `accessibility/accessibilityStorage.ts`, mesmo padrão
 * de blob único.
 */
const CHAVE_PREFERENCIAS = "acesso.segurancaPreferences";

interface PreferenciasSeguranca {
  bloqueioBiometricoAtivo: boolean;
}

/** Nunca lança — falha ao ler vira "desativado" (a opção mais segura por padrão: nunca trava alguém pra fora sozinha). */
export async function getBloqueioBiometricoAtivo(): Promise<boolean> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_PREFERENCIAS);
    if (!bruto) return false;
    const preferencias = JSON.parse(bruto) as Partial<PreferenciasSeguranca>;
    return preferencias.bloqueioBiometricoAtivo === true;
  } catch {
    return false;
  }
}

/** Também nunca lança — mesma razão de `accessibilityStorage.savePreferences`. */
export async function setBloqueioBiometricoAtivo(valor: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ bloqueioBiometricoAtivo: valor }));
  } catch {
    // Silencioso de propósito — ver comentário acima.
  }
}
