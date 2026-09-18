import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PreferenciasAcessibilidade } from "./types";

/**
 * Preferências de acessibilidade não são segredo, por isso ficam no `AsyncStorage`; o
 * `expo-secure-store` fica reservado para os tokens de sessão
 * (`armazenamento/armazenamentoSeguro.ts`).
 *
 * Tudo é gravado num único JSON porque os campos são sempre lidos e salvos juntos.
 */
const CHAVE_PREFERENCIAS = "acesso.accessibilityPreferences";

/**
 * Devolve `null` quando não há nada salvo, quando o AsyncStorage falha ou quando o JSON está
 * corrompido; nesses casos o Provider usa as preferências padrão. Nunca lança.
 */
export async function obterPreferenciasSalvas(): Promise<Partial<PreferenciasAcessibilidade> | null> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_PREFERENCIAS);
    if (!bruto) return null;
    return JSON.parse(bruto) as Partial<PreferenciasAcessibilidade>;
  } catch {
    return null;
  }
}

/**
 * Também nunca lança: se a gravação falhar, a preferência continua valendo em memória até o app ser
 * fechado.
 */
export async function salvarPreferencias(preferencias: PreferenciasAcessibilidade): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    // Silencioso de propósito (ver comentário acima).
  }
}
