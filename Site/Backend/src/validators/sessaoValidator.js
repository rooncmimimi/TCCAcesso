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

/**
 * Redefinição de senha: aceita DOIS formatos de corpo, mutuamente exclusivos.
 * - `{ token, novaSenha }` — mecanismo principal (link do e-mail, token opaco).
 * - `{ email, codigo, novaSenha }` — fallback (usado pelo app mobile, sem deep link).
 * A presença de `token` no corpo decide qual conjunto de campos é exigido.
 */
export const validarRedefinirSenha = [
    body("token")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 32 })
        .withMessage("Token inválido."),

    body("email")
        .if((_valor, { req }) => !req.body?.token)
        .trim()
        .isEmail()
        .withMessage("Informe um endereço de e-mail válido."),

    body("codigo")
        .if((_valor, { req }) => !req.body?.token)
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

/**
 * Senha atual e código de verificação de 6 dígitos — genéricos, reaproveitados
 * por mais de uma rota (pausar/excluir conta, confirmar troca de e-mail).
 */

export const validarSenhaAtual = [
    body("senhaAtual").isString().notEmpty().withMessage("Informe a senha atual.")
];

export const validarCodigoVerificacao = [
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
