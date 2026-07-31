import { body } from "express-validator";

/**
 * Regras de senha forte (OWASP ASVS 2.1):
 * mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo.
 */
const regrasSenha = (campo = "senha") =>
    body(campo)
        .isString()
        .isLength({ min: 8, max: 72 })
        .withMessage("A senha deve ter entre 8 e 72 caracteres.")
        .matches(/[a-z]/)
        .withMessage("A senha deve conter ao menos uma letra minúscula.")
        .matches(/[A-Z]/)
        .withMessage("A senha deve conter ao menos uma letra maiúscula.")
        .matches(/\d/)
        .withMessage("A senha deve conter ao menos um número.")
        .matches(/[^A-Za-z0-9]/)
        .withMessage("A senha deve conter ao menos um caractere especial.");

const regrasComuns = [
    body("nome")
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage("Informe um nome entre 3 e 150 caracteres."),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Informe um e-mail válido.")
        .isLength({ max: 150 })
        .normalizeEmail(),

    body("telefone")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 10, max: 20 })
        .withMessage("Informe um telefone válido."),

    regrasSenha("senha")
];

export const validarCadastroCandidato = [
    ...regrasComuns,

    body("cpf")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^\d{11}$/)
        .withMessage("O CPF deve conter 11 dígitos numéricos.")
];

export const validarCadastroEmpresa = [
    ...regrasComuns,

    body("cnpj")
        .trim()
        .matches(/^\d{14}$/)
        .withMessage("O CNPJ deve conter 14 dígitos numéricos."),

    body("razaoSocial")
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Informe a razão social (3 a 200 caracteres)."),

    body("nomeFantasia")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 200 })
];

export const validarLogin = [
    body("email").trim().isEmail().withMessage("Informe um e-mail válido."),

    body("senha").isString().notEmpty().withMessage("Informe a senha.")
];

export const validarTrocaSenha = [
    body("senhaAtual").isString().notEmpty().withMessage("Informe a senha atual."),

    regrasSenha("novaSenha")
];
