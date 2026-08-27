import { body, param } from "express-validator";

export const validarAtualizacaoEmpresa = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("razaoSocial")
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Informe a razão social (3 a 200 caracteres)."),

    body("nomeFantasia").optional({ values: "falsy" }).trim().isLength({ max: 200 }),

    body("descricao").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("setor").optional({ values: "falsy" }).trim().isLength({ max: 120 }),

    body("porte")
        .optional({ values: "falsy" })
        .isIn(["MEI", "Micro", "Pequena", "Media", "Grande"])
        .withMessage("Porte inválido."),

    body("site")
        .optional({ values: "falsy" })
        .trim()
        .isURL()
        .withMessage("Informe uma URL válida."),

    body("cidade").optional({ values: "falsy" }).trim().isLength({ max: 100 }),

    body("estado")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 2, max: 2 })
        .withMessage("Use a sigla do estado (ex.: SP)."),

    body("cep")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("O CEP deve conter 8 dígitos numéricos."),

    body("culturaInclusiva").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("capa").optional({ values: "falsy" }).isString().trim(),

    body("empresaVerificada")
        .optional()
        .isBoolean()
        .withMessage("Valor inválido para verificação.")
];
