import { body, param } from "express-validator";

export const validarAberturaConversa = [
    body("usuarioId")
        .isUUID()
        .withMessage("Usuário inválido.")
];

export const validarEnvioMensagem = [
    param("conversaId").isUUID().withMessage("Conversa inválida."),

    body("conteudo")
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage("A mensagem deve ter entre 1 e 2000 caracteres.")
];
