import { body } from "express-validator";
import { validarUuidParam } from "./usuarioValidator.js";

const ENTIDADE_TIPOS = [
    "postagem",
    "comentario",
    "usuario",
    "mensagem",
    "vaga",
    "empresa"
];

const MOTIVOS = [
    "spam",
    "conteudo_ofensivo",
    "discurso_odio",
    "assedio",
    "fraude",
    "informacao_falsa",
    "conteudo_inadequado",
    "outro"
];

export const validarCriacaoDenuncia = [
    body("entidadeTipo")
        .isIn(ENTIDADE_TIPOS)
        .withMessage("Tipo de entidade inválido."),

    body("entidadeId").isUUID().withMessage("Identificador da entidade inválido."),

    body("motivo").isIn(MOTIVOS).withMessage("Motivo inválido."),

    body("descricao")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Descrição deve ter no máximo 1000 caracteres.")
];

export const validarObservacaoAdmin = [
    ...validarUuidParam("id"),

    body("observacao")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Observação deve ter no máximo 1000 caracteres.")
];

const ACOES_MODERACAO = ["bloquear", "remover", "ocultar", "suspender"];

export const validarResolucaoDenuncia = [
    ...validarObservacaoAdmin,

    body("acao")
        .optional({ values: "falsy" })
        .isIn(ACOES_MODERACAO)
        .withMessage("Ação de moderação inválida.")
];
