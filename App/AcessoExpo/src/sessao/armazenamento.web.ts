/**
 * Versão para o navegador, usada só para olhar as telas durante o desenvolvimento
 * (`npx expo start --web`): o expo-secure-store não existe na web. O localStorage NÃO é
 * cifrado; o app no iPhone usa o Keychain (armazenamento.ts).
 */
function armazenamento(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export async function lerTexto(chave: string): Promise<string | null> {
  return armazenamento()?.getItem(chave) ?? null;
}

export async function gravarTexto(chave: string, valor: string): Promise<void> {
  armazenamento()?.setItem(chave, valor);
}

export async function apagarTexto(chave: string): Promise<void> {
  armazenamento()?.removeItem(chave);
}
