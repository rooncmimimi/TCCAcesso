import { body, param } from "express-validator";

export const validarCriacaoComentario = [
    param("postagemId").isUUID().withMessage("Postagem inválida."),

    body("comentario")
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("O comentário deve ter entre 1 e 1000 caracteres."),

    // Opcional — presente quando é uma resposta a outro comentário (não
    // um comentário raiz). O model Comentario e PostagemService.comentar
    // já suportavam isso; só faltava o controller/validator repassarem.
    body("comentarioPaiId")
        .optional({ values: "falsy" })
        .isUUID()
        .withMessage("Comentário respondido inválido.")
];
