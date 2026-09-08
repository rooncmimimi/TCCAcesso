import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AccessibilityPreferences } from "./accessibilityTypes";

/**
 * Único lugar do app que fala com o `AsyncStorage`. Preferências de
 * acessibilidade NÃO são segredo — não têm nada em comum com os tokens de
 * sessão (esses continuam exclusivamente no `expo-secure-store`, ver
 * `src/storage/secureStorage.ts`, intocado nesta fase). Usar o SecureStore
 * aqui também seria errado pelo motivo oposto: ele existe para segredos
 * pequenos e sensíveis, não para o "arquivo de preferências" comum de um
 * app — `AsyncStorage` é a solução padrão do ecossistema React
 * Native/Expo para exatamente este caso.
 *
 * Guardado como um único blob JSON (não uma chave por preferência): são
 * poucos campos, sempre lidos/escritos juntos, e um blob único evita ter
 * que orquestrar 11 leituras/escritas assíncronas separadas.
 */
const CHAVE_PREFERENCIAS = "acesso.accessibilityPreferences";

/**
 * `null` se nunca houve nada salvo, se o AsyncStorage falhar, ou se o valor
 * salvo não for um JSON válido — em qualquer um desses casos o chamador cai
 * para `DEFAULT_ACCESSIBILITY_PREFERENCES`. Nunca lança.
 */
export async function getStoredPreferences(): Promise<Partial<AccessibilityPreferences> | null> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_PREFERENCIAS);
    if (!bruto) return null;
    return JSON.parse(bruto) as Partial<AccessibilityPreferences>;
  } catch {
    return null;
  }
}

/**
 * Também nunca lança — uma falha ao persistir não deve derrubar a
 * experiência do usuário; a preferência simplesmente continua valendo só
 * em memória pelo resto desta sessão do app.
 */
export async function savePreferences(preferences: AccessibilityPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferences));
  } catch {
    // Silencioso de propósito — ver comentário acima.
  }
}
