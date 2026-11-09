import { z } from "zod";

import type { TFuncao } from "@/contexts/IdiomaContext";

/**
 * As cinco regras de senha do backend (`regrasSenha` em `validators/autenticacaoValidator.js`), com as
 * mensagens no idioma da tela.
 *
 * Estavam escritas três vezes — no cadastro de empresa, em `redefinir-senha` e em
 * `configuracoes/senha` — e as três em português fixo. Uma cópia só evita o pior caso: a regra mudar no
 * servidor e a mensagem continuar prometendo a antiga em duas telas.
 *
 * Recebe `t` em vez de chamar o hook porque é usada na montagem do esquema, fora da árvore do React.
 */
export function criarRegrasDeSenha(t: TFuncao) {
  return z
    .string()
    .min(8, t("validacao.senhaTamanho"))
    .max(72, t("validacao.senhaTamanho"))
    .regex(/[A-Z]/, t("validacao.senhaMaiuscula"))
    .regex(/[a-z]/, t("validacao.senhaMinuscula"))
    .regex(/\d/, t("validacao.senhaNumero"))
    .regex(/[^A-Za-z0-9]/, t("validacao.senhaEspecial"));
}
