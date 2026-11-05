import { body } from "express-validator";

export const validarAdaptacoes = [
    body("adaptacoes").isArray({ max: 40 }).withMessage("As adaptações devem ser uma lista."),
    body("adaptacoes.*").isString().isLength({ max: 60 }).withMessage("Adaptação inválida."),
    body("observacao").optional({ values: "null" }).isString().isLength({ max: 2000 }).withMessage("A observação é longa demais.")
];

export const validarComunicacao = [
    body("canaisPreferidos").optional({ values: "null" }).isArray({ max: 12 }).withMessage("Os canais preferidos devem ser uma lista."),
    body("canaisPreferidos.*").isString().isLength({ max: 60 }).withMessage("Canal inválido."),
    body("canaisAEvitar").optional({ values: "null" }).isArray({ max: 12 }).withMessage("Os canais a evitar devem ser uma lista."),
    body("canaisAEvitar.*").isString().isLength({ max: 60 }).withMessage("Canal inválido."),
    body("melhorHorario").optional({ values: "null" }).isString().isLength({ max: 500 }).withMessage("O horário é longo demais."),
    body("observacao").optional({ values: "null" }).isString().isLength({ max: 1000 }).withMessage("A observação é longa demais.")
];

export const validarPrivacidade = [
    body("exibirDeficienciaNoPerfil").isBoolean({ strict: true }).withMessage("Informe verdadeiro ou falso.")
];
