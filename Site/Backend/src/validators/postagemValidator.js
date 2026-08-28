import { body, param } from "express-validator";

/**
 * `descricoesAnexos` chega como JSON.stringify de um array de strings
 * (multipart não tem tipo array nativo) — cada posição corresponde ao
 * anexo de mesmo índice em `arquivos`. Validado como string aqui porque
 * express-validator roda antes da checagem de tipo em `PostagemService`,
 * que faz o `JSON.parse` real e descarta silenciosamente se malformado.
 */
export const validarCriacaoPostagem = [
    body("conteudo")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 3000 })
        .withMessage("O conteúdo deve ter no máximo 3000 caracteres."),

    body("imagem").optional({ values: "falsy" }).isString().trim(),

    body("descricoesAnexos").optional({ values: "falsy" }).isString()
];

export const validarAtualizacaoPostagem = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("conteudo")
        .optional()
        .trim()
        .isLength({ min: 1, max: 3000 })
        .withMessage("O conteúdo deve ter entre 1 e 3000 caracteres."),

    body("imagem").optional({ values: "falsy" }).isString().trim()
];

/** Edita só a descrição de um anexo — `null`/vazio remove a descrição. */
export const validarDescricaoAnexo = [
    body("descricao")
        .optional({ nullable: true, values: "falsy" })
        .isString()
        .isLength({ max: 500 })
        .withMessage("A descrição deve ter no máximo 500 caracteres.")
];
