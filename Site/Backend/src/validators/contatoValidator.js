import { body } from "express-validator";

import { ASSUNTOS_DE_CONTATO, LIMITES_DE_CONTATO } from "../config/contato.js";
import { campoNome } from "./camposPessoais.js";

/**
 * `POST /contato` (público): nome, e-mail para resposta, assunto da lista, mensagem de 10 a 3000 caracteres e o
 * campo-isca `website`, que deve chegar vazio.
 */
export const validarContato = [
    campoNome("nome"),

    body("email")
        .isString()
        .withMessage("Informe um e-mail válido para a resposta.")
        .bail()
        .trim()
        .isEmail()
        .withMessage("Informe um e-mail válido para a resposta.")
        .bail()
        .isLength({ max: LIMITES_DE_CONTATO.emailMaximo })
        .withMessage("O e-mail deve ter no máximo 150 caracteres."),

    body("assunto")
        .isString()
        .withMessage("Escolha um assunto da lista.")
        .bail()
        .isIn(Object.keys(ASSUNTOS_DE_CONTATO))
        .withMessage("Escolha um assunto da lista."),

    body("mensagem")
        .isString()
        .withMessage("Escreva a sua mensagem.")
        .bail()
        .customSanitizer((valor) => valor.replace(/\r\n/g, "\n").trim())
        .isLength({ min: LIMITES_DE_CONTATO.mensagemMinimo, max: LIMITES_DE_CONTATO.mensagemMaximo })
        .withMessage(
            `A mensagem deve ter entre ${LIMITES_DE_CONTATO.mensagemMinimo} e ${LIMITES_DE_CONTATO.mensagemMaximo} caracteres.`
        ),

    // Campo-isca: nenhuma pessoa o vê. Qualquer valor aqui é tratado como robô pelo serviço.
    body("website").optional({ values: "falsy" }).isString().isLength({ max: 500 })
];
