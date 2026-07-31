import { body, param } from "express-validator";

export const validarCriacaoComentario = [
    param("postagemId").isUUID().withMessage("Postagem inválida."),

    body("comentario")
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("O comentário deve ter entre 1 e 1000 caracteres.")
];
