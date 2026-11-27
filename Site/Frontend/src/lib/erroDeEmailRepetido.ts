/**
 * O cadastro recusou porque já existe uma conta com aquele e-mail?
 *
 * O servidor responde 409 com a frase "Este e-mail já está cadastrado." — dita no corpo da resposta,
 * ou como o erro do campo `email`. Distinguir isto de qualquer outro erro importa porque a saída é
 * outra: quem já tem conta não precisa de uma mensagem de erro, precisa de um caminho para entrar.
 *
 * Confere o status e o texto, e não só um dos dois: um 409 de CPF repetido também é 409, e dizer a
 * alguém que o e-mail dele já existe quando o problema é o CPF seria mandá-lo para o lugar errado.
 */
export function ehEmailJaCadastrado(erro: unknown): boolean {
  const resposta = (erro as { response?: { status?: number; data?: { mensagem?: string; erros?: Array<{ campo?: string; mensagem?: string }> } } })?.response;

  if (resposta?.status !== 409) return false;

  const doCampo = resposta.data?.erros?.some((e) => e.campo === "email") ?? false;
  const doTexto = /e-?mail/i.test(resposta.data?.mensagem ?? "");

  return doCampo || doTexto;
}
