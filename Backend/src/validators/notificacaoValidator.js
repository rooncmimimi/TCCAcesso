import { body } from "express-validator";

export const validarPreferenciasNotificacao = [
    body("vagasCandidaturas").optional().isBoolean().withMessage("Valor inválido."),
    body("mensagens").optional().isBoolean().withMessage("Valor inválido."),
    body("publicacoesComentarios").optional().isBoolean().withMessage("Valor inválido."),
    body("redeSeguidores").optional().isBoolean().withMessage("Valor inválido.")
];
