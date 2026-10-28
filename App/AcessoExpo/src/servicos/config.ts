/**
 * Endereço da API do Site (Site/Backend). Por padrão, a mesma API publicada que o app Android usa.
 * Para apontar para outra (por exemplo, a API rodando no computador durante o desenvolvimento),
 * crie App/AcessoExpo/.env.local com EXPO_PUBLIC_API_URL=http://SEU_IP:3000/api e reinicie o
 * `npx expo start`. Não coloque segredos em variáveis EXPO_PUBLIC_: elas vão dentro do app.
 */
const PADRAO = 'https://acesso-backend.onrender.com/api';

export const URL_API = normalizar(process.env.EXPO_PUBLIC_API_URL) ?? PADRAO;

function normalizar(valor: string | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo.replace(/\/+$/, '') : null;
}

/**
 * Arquivos enviados à API voltam como "/uploads/..."; o app precisa do endereço completo, que é a
 * origem da API (sem o "/api"). Endereços completos (http/https) ficam como estão.
 */
export function resolverUrl(caminho: string | null | undefined, base: string = URL_API): string | null {
  if (!caminho) {
    return null;
  }
  if (/^https?:\/\//i.test(caminho)) {
    return caminho;
  }
  const origem = base.match(/^https?:\/\/[^/]+/i)?.[0];
  if (!origem) {
    return null;
  }
  return origem + (caminho.startsWith('/') ? caminho : '/' + caminho);
}
