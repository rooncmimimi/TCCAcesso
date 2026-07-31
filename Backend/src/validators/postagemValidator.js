import { body, param } from "express-validator";

export const validarCriacaoPostagem = [
    body("conteudo")
        .trim()
        .isLength({ min: 1, max: 3000 })
        .withMessage("O conteúdo deve ter entre 1 e 3000 caracteres."),

    body("imagem").optional({ values: "falsy" }).isString().trim()
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
