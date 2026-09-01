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
        .withMessage("Informe um endereço de e-mail válido.")
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
        .withMessage("Informe um CPF válido.")
];

export const validarCadastroEmpresa = [
    ...regrasComuns,

    body("cnpj")
        .trim()
        .matches(/^\d{14}$/)
        .withMessage("Informe um CNPJ válido."),

    body("razaoSocial")
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Informe a razão social (3 a 200 caracteres)."),

    body("nomeFantasia")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 200 }),

    // Campos opcionais — cadastro reutiliza os mesmos limites do model
    // Empresa e do fluxo de edição de perfil (EditarEmpresaDialog).
    body("setor").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
    body("porte")
        .optional({ values: "falsy" })
        .isIn(["MEI", "Micro", "Pequena", "Media", "Grande"])
        .withMessage("Porte inválido."),
    body("site")
        .optional({ values: "falsy" })
        .trim()
        .isURL({ require_protocol: true })
        .withMessage("Informe uma URL válida (começando com http:// ou https://)."),
    body("descricao").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),
    body("cidade").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
    body("estado").optional({ values: "falsy" }).trim().isLength({ min: 2, max: 2 }).withMessage("Informe a UF com 2 letras."),
    body("endereco").optional({ values: "falsy" }).trim().isLength({ max: 255 }),
    body("cep")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Informe um CEP válido (8 dígitos).")
];

export const validarLogin = [
    body("email").trim().isEmail().withMessage("Informe um endereço de e-mail válido."),

    body("senha").isString().notEmpty().withMessage("Informe a senha."),

    body("codigoTotp")
        .optional({ values: "falsy" })
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("O código de verificação deve ter 6 dígitos.")
];

export const validarTrocaSenha = [
    body("senhaAtual").isString().notEmpty().withMessage("Informe a senha atual."),

    regrasSenha("novaSenha")
];
