import { body, param } from "express-validator";

export const validarDeficiencia = [
    body("nome")
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage("Informe um nome entre 3 e 100 caracteres."),

    body("descricao").optional({ values: "falsy" }).trim().isLength({ max: 1000 })
];

export const validarIdDeficiencia = [
    param("id").isUUID().withMessage("Identificador inválido.")
];
