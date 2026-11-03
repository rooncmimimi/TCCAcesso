import { body } from "express-validator";

/**
 * Validações da verificação em duas etapas. O código aceita tanto os 6 números do aplicativo quanto um
 * código de recuperação (com ou sem hífen); quem decide qual é, e se vale, é o `TotpService`.
 */

const codigo = body("codigo")
    .isString()
    .withMessage("Informe o código.")
    .bail()
    .trim()
    .isLength({ min: 6, max: 32 })
    .withMessage("Informe o código do aplicativo (6 números) ou um código de recuperação.");

const senhaAtual = body("senhaAtual")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Senha inválida.")
    .bail()
    .isLength({ max: 72 })
    .withMessage("Senha inválida.");

/** Passo 2 do login: o desafio que o servidor entregou depois da senha (ou do Google) e o código. */
export const validarLoginTotp = [
    body("desafio")
        .isString()
        .withMessage("Verificação inválida. Entre novamente.")
        .bail()
        .isLength({ min: 20, max: 2000 })
        .withMessage("Verificação inválida. Entre novamente."),
    codigo
];

/** Começar a configurar. Só quem já tem TOTP (troca de aparelho) manda senha e código. */
export const validarIniciarConfiguracaoTotp = [
    senhaAtual,
    body("codigo").optional({ values: "falsy" }).isString().withMessage("Código inválido.").bail().trim().isLength({ max: 32 }).withMessage("Código inválido.")
];

export const validarAtivarTotp = [
    body("configuracao")
        .isString()
        .withMessage("A configuração venceu. Comece de novo.")
        .bail()
        .isLength({ min: 20, max: 2000 })
        .withMessage("A configuração venceu. Comece de novo."),
    codigo
];

/** Desativar e refazer os códigos de recuperação pedem senha (quando a conta tem) e um código. */
export const validarReautenticacaoTotp = [senhaAtual, codigo];

export const validarReinicioTotp = [
    body("motivo")
        .isString()
        .withMessage("Informe o motivo do reinício.")
        .bail()
        .trim()
        .isLength({ min: 10, max: 300 })
        .withMessage("Informe o motivo do reinício, de 10 a 300 caracteres. Ele fica registrado na auditoria.")
];
