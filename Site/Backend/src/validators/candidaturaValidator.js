import { body, param } from "express-validator";
import { STATUS_CANDIDATURA } from "../models/Candidatura.js";

const ehObjeto = (valor) => valor !== null && typeof valor === "object" && !Array.isArray(valor);

/**
 * As ESCOLHAS da pessoa sobre o que compartilhar na candidatura (listas de chaves e interruptores),
 * nunca conteúdo: o servidor monta a cópia a partir do perfil dela. Qualquer coisa fora desse
 * formato é recusada em vez de ignorada em silêncio. `prefixo` é o campo do corpo que as contém.
 */
const escolhaDeCompartilhamento = (prefixo) => [
    body(prefixo).optional({ values: "null" }).custom(ehObjeto).withMessage("As escolhas de compartilhamento são inválidas."),

    body(`${prefixo}.adaptacoes`).optional({ values: "null" }).isArray({ max: 40 }).withMessage("As adaptações devem ser uma lista."),
    body(`${prefixo}.adaptacoes.*`).optional().isString().isLength({ max: 60 }).withMessage("Adaptação inválida."),

    body(`${prefixo}.comunicacao`).optional({ values: "null" }).custom(ehObjeto).withMessage("A comunicação deve ser um objeto."),

    ...["deficiencia", "observacaoDeAdaptacao", "observacaoDeComunicacao"].map((campo) =>
        body(`${prefixo}.${campo}`)
            .optional({ values: "null" })
            .isBoolean({ strict: true })
            .withMessage(`${campo} deve ser verdadeiro ou falso.`)
    ),

    body(`${prefixo}.outra`)
        .optional({ values: "null" })
        .isString()
        .isLength({ max: 600 })
        .withMessage("O texto da outra necessidade é longo demais.")
];

const confirmacaoDaAutorizacao = body("aceita")
    .optional({ values: "null" })
    .isBoolean({ strict: true })
    .withMessage("A confirmação deve ser verdadeira ou falsa.");

export const validarCriacaoCandidatura = [
    param("vagaId").isUUID().withMessage("Vaga inválida."),

    body("mensagem")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 2000 })
        .withMessage("A mensagem deve ter no máximo 2000 caracteres."),

    ...escolhaDeCompartilhamento("compartilhar"),

    confirmacaoDaAutorizacao
];

/** Prévia de privacidade: as mesmas escolhas. */
export const validarPreviaDaCandidatura = [
    param("vagaId").isUUID().withMessage("Vaga inválida."),

    ...escolhaDeCompartilhamento("compartilhar")
];

export const validarRascunhoDaCandidatura = [
    param("vagaId").isUUID().withMessage("Vaga inválida."),

    body("mensagem")
        .optional({ values: "null" })
        .isString()
        .withMessage("Mensagem inválida.")
        .isLength({ max: 4000 })
        .withMessage("A mensagem é longa demais."),

    body("etapa").optional().isIn(["mensagem", "adaptacoes", "revisao"]).withMessage("Etapa inválida."),

    ...escolhaDeCompartilhamento("selecao")
];

export const validarEdicaoDeAdaptacoes = [
    param("id").isUUID().withMessage("Identificador inválido."),

    ...escolhaDeCompartilhamento("compartilhar"),

    confirmacaoDaAutorizacao
];

export const validarRespostaDeAdaptacao = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("resposta")
        .isString()
        .isIn(["podemos_oferecer", "podemos_providenciar", "precisamos_verificar", "podemos_conversar"])
        .withMessage("Escolha uma resposta válida."),

    body("mensagem").optional({ values: "null" }).isString().isLength({ max: 1000 }).withMessage("A mensagem é longa demais.")
];

export const validarStatusCandidatura = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("status")
        .isIn(STATUS_CANDIDATURA)
        .withMessage("Status de candidatura inválido.")
];
