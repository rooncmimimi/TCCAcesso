import { body, param } from "express-validator";

const MODALIDADES = ["presencial", "hibrido", "remoto"];
const CONTRATOS = ["clt", "pj", "estagio", "jovem_aprendiz", "temporario"];
const STATUS = ["aberta", "pausada", "encerrada"];
const PUBLICO_ALVO = ["geral", "pcd", "cinquenta_mais", "pcd_cinquenta_mais"];

// Lista fechada: os recursos de acessibilidade da vaga não são texto
// livre (esse já existe no campo `acessibilidade`). "outro" existe para
// cobrir um recurso relevante que não está nesta lista, sem virar texto
// livre disfarçado: o detalhe complementar vai no campo `acessibilidade`.
export const RECURSOS_ACESSIBILIDADE = [
    "interprete_libras",
    "tecnologia_assistiva",
    "ambiente_fisico_acessivel",
    "banheiro_adaptado",
    "elevador_rampa",
    "jornada_adaptavel",
    "ferramentas_digitais_acessiveis",
    "outro"
];

const camposVaga = (obrigatorio) => [
    body("titulo")
        [obrigatorio ? "exists" : "optional"]()
        .bail()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage("O título deve ter entre 5 e 200 caracteres."),

    body("descricao")
        [obrigatorio ? "exists" : "optional"]()
        .bail()
        .trim()
        .isLength({ min: 20, max: 8000 })
        .withMessage("A descrição deve ter no mínimo 20 caracteres."),

    body("requisitos").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("beneficios").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("salario")
        .optional({ values: "falsy" })
        .isDecimal({ decimal_digits: "0,2" })
        .withMessage("Informe um salário numérico válido."),

    body("modalidade")
        .optional({ values: "falsy" })
        .isIn(MODALIDADES)
        .withMessage("Modalidade inválida."),

    body("contrato")
        .optional({ values: "falsy" })
        .isIn(CONTRATOS)
        .withMessage("Tipo de contrato inválido."),

    body("cidade").optional({ values: "falsy" }).trim().isLength({ max: 100 }),

    body("estado")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 2, max: 2 })
        .withMessage("Use a sigla do estado (ex.: SP)."),

    body("cargaHoraria").optional({ values: "falsy" }).trim().isLength({ max: 50 }),

    body("publicoAlvo").optional({ values: "falsy" }).isIn(PUBLICO_ALVO).withMessage("Público-alvo inválido."),

    body("recursosAcessibilidade")
        .optional()
        .isArray({ max: RECURSOS_ACESSIBILIDADE.length })
        .withMessage("Recursos de acessibilidade deve ser uma lista."),

    body("recursosAcessibilidade.*")
        .isIn(RECURSOS_ACESSIBILIDADE)
        .withMessage("Recurso de acessibilidade inválido."),

    body("acessibilidade").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),

    body("status").optional({ values: "falsy" }).isIn(STATUS).withMessage("Status inválido."),

    body("dataEncerramento")
        .optional({ values: "falsy" })
        .isISO8601()
        .withMessage("Informe uma data válida (AAAA-MM-DD)."),

    // Bloco 3: o conteúdo de cada lista fechada é conferido (e recusado) em `utils/ambienteDeTrabalho.js`;
    // aqui só o formato e o tamanho.
    body("atividades").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("requisitosDesejaveis").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("etapasSelecao").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),

    body("entrevistaAdaptacoes").optional({ values: "null" }).isArray({ max: 20 }).withMessage("As adaptações da entrevista devem ser uma lista."),

    body("entrevistaObservacao").optional({ values: "falsy" }).isString().isLength({ max: 1000 }),

    body("ambienteSensorial")
        .optional({ values: "null" })
        .custom((v) => v !== null && typeof v === "object" && !Array.isArray(v))
        .withMessage("A prévia sensorial deve ser um objeto."),

    body("acessibilidadeFisica")
        .optional({ values: "null" })
        .custom((v) => v !== null && typeof v === "object" && !Array.isArray(v))
        .withMessage("O mapa de acessibilidade física deve ser um objeto.")
];

export const validarCriacaoVaga = camposVaga(true);

export const validarAtualizacaoVaga = [
    param("id").isUUID().withMessage("Identificador inválido."),
    ...camposVaga(false)
];

export const validarStatusVaga = [
    param("id").isUUID().withMessage("Identificador inválido."),

    body("status").isIn(STATUS).withMessage("Status inválido.")
];
