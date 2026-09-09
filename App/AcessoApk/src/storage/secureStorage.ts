import * as SecureStore from "expo-secure-store";

/**
 * Único lugar do app que fala com o armazenamento seguro do dispositivo.
 *
 * Usa `expo-secure-store` — no Android ele grava em `EncryptedSharedPreferences`
 * (apoiado no Android Keystore); no iOS usa o Keychain. Isso é deliberadamente
 * diferente de `AsyncStorage`, que grava em texto plano em um arquivo comum do
 * app e nunca deveria guardar um token de sessão.
 *
 * Só os DOIS tokens ficam aqui. Nunca a senha do usuário, nem uma cópia do
 * objeto de usuário "por conveniência" — os dados de perfil são buscados da
 * API (`/auth/me`) quando necessário, então não há razão para duplicá-los em
 * disco (Fase 3, item 26).
 *
 * Nomes de chave: o site usa `"acesso:accessToken"`/`"acesso:refreshToken"`
 * no localStorage, mas o SecureStore só aceita `[A-Za-z0-9._-]` como nome de
 * chave — ":" não é permitido e a chamada lançaria em tempo de execução. Por
 * isso as chaves aqui usam "." em vez de ":", sem nenhuma relação com o
 * armazenamento do site (são instâncias de storage completamente diferentes,
 * em plataformas diferentes).
 */
const ACCESS_TOKEN_KEY = "acesso.accessToken";
const REFRESH_TOKEN_KEY = "acesso.refreshToken";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/** `null` se qualquer um dos dois tokens não existir — uma sessão parcial não é uma sessão válida. */
export async function getTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
}
