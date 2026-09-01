/**
 * Máscaras de exibição para CPF e CNPJ — só formatam o que o usuário vê.
 * A validação de verdade continua no backend, sempre sobre dígitos puros
 * (o valor enviado à API nunca tem pontuação — ver `somenteDigitos`).
 */

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** "12345678901" -> "123.456.789-01" (formata progressivamente, até 11 dígitos). */
export function formatarCpf(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11);
  const partes = [
    digitos.slice(0, 3),
    digitos.slice(3, 6),
    digitos.slice(6, 9),
    digitos.slice(9, 11),
  ].filter(Boolean);

  let resultado = partes[0] ?? "";
  if (partes[1]) resultado += `.${partes[1]}`;
  if (partes[2]) resultado += `.${partes[2]}`;
  if (partes[3]) resultado += `-${partes[3]}`;
  return resultado;
}

/** "12345678000199" -> "12.345.678/0001-99" (formata progressivamente, até 14 dígitos). */
export function formatarCnpj(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 14);
  const partes = [
    digitos.slice(0, 2),
    digitos.slice(2, 5),
    digitos.slice(5, 8),
    digitos.slice(8, 12),
    digitos.slice(12, 14),
  ].filter(Boolean);

  let resultado = partes[0] ?? "";
  if (partes[1]) resultado += `.${partes[1]}`;
  if (partes[2]) resultado += `.${partes[2]}`;
  if (partes[3]) resultado += `/${partes[3]}`;
  if (partes[4]) resultado += `-${partes[4]}`;
  return resultado;
}
