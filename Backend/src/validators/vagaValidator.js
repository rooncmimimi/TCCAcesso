import { body, param } from "express-validator";

const MODALIDADES = ["Presencial", "Hibrido", "Remoto"];
const CONTRATOS = ["CLT", "PJ", "Estagio", "JovemAprendiz", "Temporario"];
const STATUS = ["Aberta", "Pausada", "Encerrada"];

const camposVaga = (obrigatorio) => [
    body("titulo")
        [obrigatorio ? "exists" : "optional"]()
        .bail()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage("O título deve ter entre 5 e 200 caracteres."),

    body("descricao")
        [obrigatorio ? "exists" : "optional"]()
        .bail()
        .trim()
        .isLength({ min: 20, max: 8000 })
        .withMessage("A descrição deve ter no mínimo 20 caracteres."),

    body("requisitos").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("beneficios").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("salario")
        .optional({ values: "falsy" })
        .isDecimal({ decimal_digits: "0,2" })
        .withMessage("Informe um salário numérico válido."),

    body("modalidade")
        .optional({ values: "falsy" })
        .isIn(MODALIDADES)
        .withMessage("Modalidade inválida."),

    body("contrato")
        .optional({ values: "falsy" })
        .isIn(CONTRATOS)
        .withMessage("Tipo de contrato inválido."),

    body("cidade").optional({ values: "falsy" }).trim().isLength({ max: 100 }),

    body("estado")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 2, max: 2 })
        .withMessage("Use a sigla do estado (ex.: SP)."),

    body("cargaHoraria").optional({ values: "falsy" }).trim().isLength({ max: 50 }),

    body("exclusivaPcd").optional().isBoolean(),

    body("acessibilidade").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),

    body("status").optional({ values: "falsy" }).isIn(STATUS).withMessage("Status inválido."),

    body("dataEncerramento")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("Informe uma data válida (AAAA-MM-DD).")
];

export const validarCriacaoVaga = camposVaga(true);

export const validarAtualizacaoVaga = [
    param("id").isUUID().withMessage("Identificador inválido."),
    ...camposVaga(false)
];

export const validarStatusVaga = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("status").isIn(STATUS).withMessage("Status inválido.")
];
