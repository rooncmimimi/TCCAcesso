import { body } from "express-validator";

export const validarPreferenciasNotificacao = [
    body("vagasCandidaturas").optional().isBoolean().withMessage("Valor inválido."),
    body("mensagens").optional().isBoolean().withMessage("Valor inválido."),
    body("publicacoesComentarios").optional().isBoolean().withMessage("Valor inválido."),
    body("redeSeguidores").optional().isBoolean().withMessage("Valor inválido.")
];

/** Fase R5 — registro de Expo push token. O formato exato do token
 * (`ExponentPushToken[...]`) é checado no service (`Expo.isExpoPushToken`);
 * aqui só o básico de presença/tipo. */
export const validarRegistroPushToken = [
    body("token").isString().withMessage("Token inválido.").bail().trim().notEmpty().withMessage("Token obrigatório."),
    body("plataforma").isIn(["android", "ios"]).withMessage("Plataforma inválida.")
];

export const validarRemocaoPushToken = [
    body("token").isString().withMessage("Token inválido.").bail().trim().notEmpty().withMessage("Token obrigatório.")
];
