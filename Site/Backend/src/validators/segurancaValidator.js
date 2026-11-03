import { body } from "express-validator";

/** Validações do Bloco 3: verificação por e-mail do dispositivo e conta comprometida. */

const desafio = body("desafio")
    .isString()
    .withMessage("Verificação inválida. Entre novamente.")
    .bail()
    .isLength({ min: 20, max: 2000 })
    .withMessage("Verificação inválida. Entre novamente.");

export const validarLoginDispositivo = [
    desafio,
    body("codigo")
        .isString()
        .withMessage("Informe o código de 6 números que enviamos por e-mail.")
        .bail()
        .customSanitizer((valor) => String(valor).replace(/\s+/g, ""))
        .matches(/^\d{6}$/)
        .withMessage("Informe o código de 6 números que enviamos por e-mail."),
    body("lembrar").optional().isBoolean().withMessage("Valor inválido.").toBoolean()
];

export const validarReenvioDeCodigo = [desafio];

export const validarSolicitarContaComprometida = [
    body("email").trim().isEmail().withMessage("Informe um endereço de e-mail válido.")
];

export const validarConfirmarContaComprometida = [
    body("token")
        .isString()
        .withMessage("Link inválido.")
        .bail()
        .isLength({ min: 20, max: 300 })
        .withMessage("Link inválido.")
];

export const validarProtegerAgora = [
    body("senhaAtual").optional({ values: "falsy" }).isString().withMessage("Senha inválida.").bail().isLength({ max: 72 }).withMessage("Senha inválida.")
];
