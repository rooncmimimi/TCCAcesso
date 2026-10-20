import { z } from "zod";

import type { Dicionario } from "./dicionario";

/**
 * Regras de validação reutilizáveis, com as mensagens no idioma atual.
 *
 * Os esquemas do Zod são montados dentro dos componentes (com `useMemo` sobre o dicionário), e não
 * como constantes de módulo: uma constante fixaria a mensagem no idioma em que o arquivo foi
 * carregado.
 */
export function regraEmail(v: Dicionario["validacao"]) {
  return z.string().trim().min(1, v.informeEmail).email(v.emailInvalido);
}

/** As mesmas regras de senha forte do backend (`regrasSenha` em `autenticacaoValidator.js`). */
export function regraSenha(v: Dicionario["validacao"]) {
  return z
    .string()
    .min(8, v.senhaTamanho)
    .max(72, v.senhaTamanho)
    .regex(/[A-Z]/, v.senhaMaiuscula)
    .regex(/[a-z]/, v.senhaMinuscula)
    .regex(/\d/, v.senhaNumero)
    .regex(/[^A-Za-z0-9]/, v.senhaEspecial);
}

/** Código de 6 dígitos (confirmação de e-mail e redefinição de senha). */
export function regraCodigo6(v: Dicionario["validacao"]) {
  return z.string().trim().length(6, v.codigo6).regex(/^\d{6}$/, v.codigoNumeros);
}
