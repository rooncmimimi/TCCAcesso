import { body, param } from "express-validator";

import { campoCpf, campoDataNascimento, campoEstado, campoPais } from "./camposPessoais.js";

export const validarAtualizacaoCandidato = [
    param("id").isUUID().withMessage("Identificador inválido."),

    campoCpf(),

    campoDataNascimento(),

    body("genero").optional({ values: "falsy" }).trim().isLength({ max: 40 }),

    body("biografia").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),

    body("escolaridade").optional({ values: "falsy" }).trim().isLength({ max: 120 }),

    body("linkedin")
        .optional({ values: "falsy" })
        .trim()
        .isURL()
        .withMessage("Informe uma URL válida para o LinkedIn."),

    body("github")
        .optional({ values: "falsy" })
        .trim()
        .isURL()
        .withMessage("Informe uma URL válida para o GitHub."),

    body("cidade").optional({ values: "falsy" }).trim().isLength({ max: 100 }),

    // Código ISO 3166-1 alpha-2, não o nome do país (veja o model Candidato). Antes do estado, que
    // depende dele: para quem mora no Brasil a sigla precisa ser de um estado de verdade.
    campoPais(),

    campoEstado(),

    body("cep")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("O CEP deve conter 8 dígitos numéricos."),

    body("disponibilidade")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 }),

    body("pretensaoSalarial")
        .optional({ values: "falsy" })
        .isDecimal({ decimal_digits: "0,2" })
        .withMessage("Informe um valor numérico válido.")
];

export const validarVinculoDeficiencia = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("deficienciaId").isUUID().withMessage("Deficiência inválida."),

    body("observacoes").optional({ values: "falsy" }).trim().isLength({ max: 1000 })
];
