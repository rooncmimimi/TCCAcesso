import { body, param } from "express-validator";

export const validarAtualizacaoCandidato = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("cpf")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^\d{11}$/)
        .withMessage("Informe um CPF válido."),

    body("dataNascimento")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("Informe uma data de nascimento válida (AAAA-MM-DD)."),

    body("genero").optional({ values: "falsy" }).trim().isLength({ max: 40 }),

    body("biografia").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),

    body("escolaridade").optional({ values: "falsy" }).trim().isLength({ max: 120 }),

    body("experiencia").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("habilidades").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),

    body("linkedin")
        .optional({ values: "falsy" })
        .trim()
        .isURL()
        .withMessage("Informe uma URL válida para o LinkedIn."),

    body("github")
        .optional({ values: "falsy" })
        .trim()
        .isURL()
        .withMessage("Informe uma URL válida para o GitHub."),

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

    body("disponibilidade")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 }),

    body("pretensaoSalarial")
        .optional({ values: "falsy" })
        .isDecimal({ decimal_digits: "0,2" })
        .withMessage("Informe um valor numérico válido.")
];

export const validarVinculoDeficiencia = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("deficienciaId").isUUID().withMessage("Deficiência inválida."),

    body("observacoes").optional({ values: "falsy" }).trim().isLength({ max: 1000 })
];
