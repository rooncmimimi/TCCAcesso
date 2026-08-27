import { body } from "express-validator";

/** Validações de sessão (refresh) e recuperação de senha. */

export const validarRefresh = [
    body("refreshToken")
        .isString()
        .isLength({ min: 32, max: 256 })
        .withMessage("Refresh token inválido.")
];

export const validarEsqueciSenha = [
    body("email")
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage("Informe um e-mail válido.")
];

export const validarRedefinirSenha = [
    body("email").trim().isEmail().withMessage("Informe um e-mail válido."),

    body("codigo")
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("O código deve ter 6 dígitos."),

    body("novaSenha")
        .isLength({ min: 8, max: 72 })
        .withMessage("A senha deve ter entre 8 e 72 caracteres.")
        .matches(/[A-Z]/)
        .withMessage("A senha deve conter ao menos uma letra maiúscula.")
        .matches(/[a-z]/)
        .withMessage("A senha deve conter ao menos uma letra minúscula.")
        .matches(/\d/)
        .withMessage("A senha deve conter ao menos um número.")
];

/** Autenticação de dois fatores (2FA). */

export const validarSenhaAtual2FA = [
    body("senhaAtual").isString().notEmpty().withMessage("Informe a senha atual.")
];

export const validarCodigo2FA = [
    body("codigo")
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("O código deve ter 6 dígitos.")
];

/** Troca de e-mail. */

export const validarSolicitarTrocaEmail = [
    body("senhaAtual").isString().notEmpty().withMessage("Informe a senha atual."),

    body("novoEmail")
        .trim()
        .isEmail()
        .withMessage("Informe um e-mail válido.")
        .isLength({ max: 150 })
        .normalizeEmail()
];
