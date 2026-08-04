import { body } from "express-validator";

export const validarPreferencias = [
    body("tema")
        .optional()
        .isIn(["claro", "escuro", "sistema"])
        .withMessage("Tema inválido."),

    body("escalaFonte")
        .optional()
        .isInt({ min: 80, max: 200 })
        .withMessage("A escala de fonte deve estar entre 80 e 200."),

    body("velocidadeVoz")
        .optional()
        .isFloat({ min: 0.5, max: 2 })
        .withMessage("A velocidade da voz deve estar entre 0.5 e 2."),

    ...[
        "altoContraste",
        "fonteDislexia",
        "espacamentoTexto",
        "reduzirAnimacoes",
        "leituraPorVoz",
        "consentimentoVoz",
        "linguagemSimplificada",
        "libras",
        "destaqueFoco"
    ].map((campo) =>
        body(campo)
            .optional()
            .isBoolean()
            .withMessage(`O campo ${campo} deve ser booleano.`)
    )
];
