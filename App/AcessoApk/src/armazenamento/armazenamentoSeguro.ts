import * as SecureStore from "expo-secure-store";

/**
 * Os tokens de sessão ficam só aqui, no `expo-secure-store` (Keystore no Android, Keychain no iOS),
 * e nunca no AsyncStorage, que grava em texto plano. Senha e dados do perfil não são guardados: o
 * perfil vem da API (`/auth/me`) quando preciso.
 *
 * As chaves usam "." porque o SecureStore só aceita `[A-Za-z0-9._-]` no nome; o Site usa ":" no
 * localStorage, mas os dois armazenamentos não têm relação.
 */
const CHAVE_ACCESS_TOKEN = "acesso.accessToken";
const CHAVE_REFRESH_TOKEN = "acesso.refreshToken";

export interface TokensSalvos {
  accessToken: string;
  refreshToken: string;
}

export async function salvarTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(CHAVE_ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(CHAVE_REFRESH_TOKEN, refreshToken),
  ]);
}

/** `null` se qualquer um dos dois tokens não existir: uma sessão parcial não é uma sessão válida. */
export async function obterTokens(): Promise<TokensSalvos | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(CHAVE_ACCESS_TOKEN),
    SecureStore.getItemAsync(CHAVE_REFRESH_TOKEN),
  ]);

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function limparTokens(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(CHAVE_ACCESS_TOKEN), SecureStore.deleteItemAsync(CHAVE_REFRESH_TOKEN)]);
}
