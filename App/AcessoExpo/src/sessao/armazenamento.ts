import * as SecureStore from 'expo-secure-store';

/**
 * Onde a sessão fica guardada no iPhone: no Keychain (expo-secure-store), cifrada pelo sistema.
 * THIS_DEVICE_ONLY: a sessão não vai para backup nem para outro aparelho; quem troca de iPhone
 * entra de novo. AFTER_FIRST_UNLOCK: o app consegue ler depois do primeiro desbloqueio do aparelho.
 */
const OPCOES: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export function lerTexto(chave: string): Promise<string | null> {
  return SecureStore.getItemAsync(chave, OPCOES);
}

export function gravarTexto(chave: string, valor: string): Promise<void> {
  return SecureStore.setItemAsync(chave, valor, OPCOES);
}

export function apagarTexto(chave: string): Promise<void> {
  return SecureStore.deleteItemAsync(chave, OPCOES);
}
