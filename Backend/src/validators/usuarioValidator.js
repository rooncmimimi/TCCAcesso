import { body, param } from "express-validator";

export const validarUuidParam = (nome = "id") => [
    param(nome).isUUID().withMessage("Identificador inválido.")
];

export const validarAtualizacaoUsuario = [
    ...validarUuidParam("id"),

    body("nome")
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage("Informe um nome entre 3 e 150 caracteres."),

    body("telefone")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 10, max: 20 })
        .withMessage("Informe um telefone válido."),

    body("fotoPerfil").optional({ values: "falsy" }).isString().trim(),

    // Campos sensíveis são explicitamente rejeitados (mass assignment).
    body(["email", "senha", "senhaHash", "tipoUsuario", "ativo"])
        .not()
        .exists()
        .withMessage("Campo não pode ser alterado por esta rota.")
];
