import { body, param } from "express-validator";

import { campoNome } from "./camposPessoais.js";

/** Exige que o parâmetro de rota `nome` (por padrão `id`) seja um UUID. */
export const validarUuidParam = (nome = "id") => [
    param(nome).isUUID().withMessage("Identificador inválido.")
];

export const validarAtualizacaoUsuario = [
    ...validarUuidParam("id"),

    campoNome("nome", { opcional: true }),

    body("telefone")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 10, max: 20 })
        .withMessage("Informe um telefone válido."),

    body("fotoPerfil").optional({ values: "falsy" }).isString().trim(),

    body("capaPerfil").optional({ values: "falsy" }).isString().trim(),

    // Campos sensíveis são explicitamente rejeitados (mass assignment).
    body(["email", "senha", "senhaHash", "tipoUsuario", "ativo"])
        .not()
        .exists()
        .withMessage("Campo não pode ser alterado por esta rota.")
];
