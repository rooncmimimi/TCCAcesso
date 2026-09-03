import { body } from "express-validator";
import { regrasSenha } from "./authValidator.js";

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
        .withMessage("Informe um endereço de e-mail válido.")
];

export const validarRedefinirSenha = [
    body("email").trim().isEmail().withMessage("Informe um endereço de e-mail válido."),

    body("codigo")
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("O código deve ter 6 dígitos."),

    regrasSenha("novaSenha")
];

/** Confirmação de e-mail de cadastro (rotas públicas — antes do login). */

export const validarConfirmarCadastro = [
    body("email").trim().isEmail().withMessage("Informe um endereço de e-mail válido."),

    body("codigo")
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("O código deve ter 6 dígitos.")
];

export const validarReenviarConfirmacaoCadastro = [
    body("email")
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage("Informe um endereço de e-mail válido.")
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
        .withMessage("Informe um endereço de e-mail válido.")
        .isLength({ max: 150 })
        .normalizeEmail()
];
