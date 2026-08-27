import { body } from "express-validator";

export const validarPrivacidade = [
    body("perfilPublico")
        .isBoolean()
        .withMessage("Informe se o perfil é público (true/false).")
];
