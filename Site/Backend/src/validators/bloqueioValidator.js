import { body } from "express-validator";

export const validarPrivacidade = [
    body("perfilPublico")
        .isBoolean()
        .withMessage("Informe se o perfil é público (true/false).")
];

const OPCOES_PREFERENCIA_MENSAGENS = [
    "todos",
    "seguidores",
    "seguindo",
    "mutuo",
    "empresas",
    "ninguem"
];

export const validarPreferenciaMensagens = [
    body("preferenciaMensagens")
        .isIn(OPCOES_PREFERENCIA_MENSAGENS)
        .withMessage("Opção de privacidade de mensagens inválida.")
];
