import { isAxiosError } from "axios";

interface CorpoErroApi {
  mensagem?: string;
  erros?: { campo?: string; mensagem?: string }[];
}

/**
 * Converte qualquer erro numa mensagem para quem usa o app, sem status HTTP, texto do Axios ou
 * stack. Toda mensagem de erro exibida passa por aqui.
 *
 * Ordem de prioridade, seguindo o formato do backend:
 * - mensagem do primeiro erro de validação, `{ erros: [{ campo, mensagem }] }`
 *   (`validacaoMiddleware.js`); o campo se chama `mensagem`, não `msg`;
 * - mensagem geral da API, `{ mensagem }` (`erroMiddleware.js`), já pronta para exibir;
 * - mensagem padrão passada por quem chama.
 */
export function extrairMensagemErro(erro: unknown, padrao: string): string {
  if (!isAxiosError(erro)) return padrao;

  if (!erro.response) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  const dados = erro.response.data as CorpoErroApi | undefined;
  return dados?.erros?.[0]?.mensagem ?? dados?.mensagem ?? padrao;
}
