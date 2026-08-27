import { body, param } from "express-validator";
import { STATUS_CANDIDATURA } from "../models/Candidatura.js";

export const validarCriacaoCandidatura = [
    param("vagaId").isUUID().withMessage("Vaga inválida."),

    body("mensagem")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 2000 })
        .withMessage("A mensagem deve ter no máximo 2000 caracteres.")
];

export const validarStatusCandidatura = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("status")
        .isIn(STATUS_CANDIDATURA)
        .withMessage("Status de candidatura inválido.")
];
