import { body, param } from "express-validator";

export const validarAberturaConversa = [
    body("candidatoId")
        .optional({ values: "falsy" })
        .isUUID()
        .withMessage("Candidato inválido."),

    body("empresaId")
        .optional({ values: "falsy" })
        .isUUID()
        .withMessage("Empresa inválida.")
];

export const validarEnvioMensagem = [
    param("conversaId").isUUID().withMessage("Conversa inválida."),

    body("conteudo")
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage("A mensagem deve ter entre 1 e 2000 caracteres.")
];
