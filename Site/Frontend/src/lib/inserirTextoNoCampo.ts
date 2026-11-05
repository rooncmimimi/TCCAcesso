/**
 * Acrescenta `texto` ao fim de um campo de texto da página (por `id`), respeitando o `maxLength` do
 * campo, e avisa o resto da página como se a pessoa tivesse digitado. Usar o `value` nativo do
 * prototype é o que faz o React (campos controlados) perceber a mudança. Devolve se o campo foi achado.
 */
export function inserirTextoNoCampo(campoId: string, texto: string): boolean {
  const campo = document.getElementById(campoId);

  if (!(campo instanceof HTMLTextAreaElement || campo instanceof HTMLInputElement)) return false;

  const atual = campo.value;
  const separador = atual && !/\s$/.test(atual) ? " " : "";
  let novo = `${atual}${separador}${texto}`;

  if (campo.maxLength > 0) novo = novo.slice(0, campo.maxLength);

  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const definir = Object.getOwnPropertyDescriptor(prototipo, "value")?.set;

  if (definir) definir.call(campo, novo);
  else campo.value = novo;

  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.focus();

  return true;
}
