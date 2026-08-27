import { body, param } from "express-validator";

const RECURSOS = ["experiencias", "formacoes", "certificados", "habilidades"];

export const validarRecurso = [
    param("recurso")
        .isIn(RECURSOS)
        .withMessage("Recurso de perfil inválido.")
];

export const validarIdRecurso = [
    ...validarRecurso,
    param("id").isUUID().withMessage("Identificador inválido.")
];

const textoOpcional = (campo, max) =>
    body(campo)
        .optional({ nullable: true })
        .trim()
        .isLength({ max })
        .withMessage(`O campo ${campo} deve ter no máximo ${max} caracteres.`);

const dataOpcional = (campo) =>
    body(campo)
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage(`Informe uma data válida em ${campo}.`);

/**
 * Validação condicional por recurso — cada tipo tem campos próprios.
 */
export const validarCorpoPerfil = [
    body("cargo")
        .if(param("recurso").equals("experiencias"))
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage("Informe o cargo (2 a 150 caracteres)."),

    body("empresa")
        .if(param("recurso").equals("experiencias"))
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage("Informe a empresa (2 a 150 caracteres)."),

    body("dataInicio")
        .if(param("recurso").equals("experiencias"))
        .isISO8601()
        .withMessage("Informe a data de início."),

    body("instituicao")
        .if(param("recurso").equals("formacoes"))
        .trim()
        .isLength({ min: 2, max: 180 })
        .withMessage("Informe a instituição (2 a 180 caracteres)."),

    body("curso")
        .if(param("recurso").equals("formacoes"))
        .trim()
        .isLength({ min: 2, max: 180 })
        .withMessage("Informe o curso (2 a 180 caracteres)."),

    body("titulo")
        .if(param("recurso").equals("certificados"))
        .trim()
        .isLength({ min: 2, max: 180 })
        .withMessage("Informe o título do certificado."),

    body("nome")
        .if(param("recurso").equals("habilidades"))
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage("Informe a habilidade (2 a 80 caracteres)."),

    body("nivel")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 80 })
        .withMessage("Nível inválido."),

    textoOpcional("local", 150),
    textoOpcional("modalidade", 50),
    textoOpcional("descricao", 2000),
    textoOpcional("credencialUrl", 500),
    dataOpcional("dataFim"),
    dataOpcional("emitidoEm"),
    dataOpcional("expiraEm"),

    body("atual").optional().isBoolean().withMessage("Campo 'atual' inválido."),
    body("emAndamento")
        .optional()
        .isBoolean()
        .withMessage("Campo 'emAndamento' inválido.")
];
