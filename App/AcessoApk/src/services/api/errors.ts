import { isAxiosError } from "axios";

interface CorpoErroApi {
  mensagem?: string;
  erros?: { campo?: string; mensagem?: string }[];
}

/**
 * Nunca deixe um erro técnico (status HTTP, texto do Axios, stack) chegar
 * até a tela — sempre passe o erro por aqui antes de mostrar qualquer coisa
 * ao usuário (Fase 3, itens 19-20).
 *
 * Ordem de prioridade, conforme o formato real do backend (auditoria):
 * 1. Mensagem de um erro de validação de campo específico —
 *    `{ erros: [{ campo, mensagem }] }` (`validationMiddleware.js`).
 *    IMPORTANTE: o campo chama-se `mensagem`, não `msg`. O frontend web lê
 *    `erros?.[0]?.msg`, que nunca bate com o que o backend envia — uma
 *    inconsistência real encontrada na auditoria (ver relatório final,
 *    "Problemas encontrados"). Aqui usamos o nome de campo correto.
 * 2. Mensagem geral da API — `{ mensagem }` (`errorMiddleware.js`), já em
 *    português e pronta para o usuário (ex.: "E-mail ou senha inválidos.").
 * 3. Mensagem padrão fornecida pelo chamador.
 */
export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;

  if (!error.response) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  const dados = error.response.data as CorpoErroApi | undefined;
  return dados?.erros?.[0]?.mensagem ?? dados?.mensagem ?? fallback;
}
