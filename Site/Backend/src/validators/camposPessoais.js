import { body } from "express-validator";

import {
    MENSAGENS_DATA_NASCIMENTO,
    TAMANHO_MAXIMO_NOME,
    TAMANHO_MINIMO_NOME,
    cpfValido,
    nomeValido,
    normalizarNome,
    somenteDigitos,
    validarDataNascimento
} from "../utils/validacoesPessoais.js";
import { ehCodigoDePais, ehSiglaDeEstado } from "../utils/localidades.js";

/**
 * Regras de rota para os dados pessoais que mais de um endpoint recebe. Ficam num lugar só para
 * cadastro, edição de perfil e edição de usuário não divergirem (antes cada um tinha a sua regra).
 *
 * O CPF nunca entra em mensagem de erro: a resposta diz só que o número é inválido.
 */

/** Nome de pessoa: normaliza (NFC, espaços colapsados, sem espaço nas pontas) e confere os caracteres. */
export const campoNome = (campo = "nome", { opcional = false } = {}) => {
    const regra = body(campo);

    if (opcional) {
        regra.optional();
    }

    return regra
        .isString()
        .withMessage("Informe o nome.")
        .bail()
        .customSanitizer(normalizarNome)
        .custom((valor) => valor.length >= TAMANHO_MINIMO_NOME && valor.length <= TAMANHO_MAXIMO_NOME)
        .withMessage(`Informe um nome entre ${TAMANHO_MINIMO_NOME} e ${TAMANHO_MAXIMO_NOME} caracteres.`)
        .bail()
        .custom(nomeValido)
        .withMessage(
            "O nome pode ter letras, espaços, hífen, apóstrofo e ponto de abreviação. Não use números nem símbolos."
        );
};

/**
 * CPF: aceita com ou sem pontuação, grava só os dígitos e confere os dígitos verificadores. O campo é
 * opcional na edição de perfil; no cadastro de candidato é obrigatório (`obrigatorio: true`).
 */
export const campoCpf = ({ obrigatorio = false } = {}) => {
    const regra = body("cpf");

    if (!obrigatorio) {
        regra.optional({ values: "falsy" });
    }

    return regra
        .isString()
        .withMessage("Informe um CPF válido.")
        .bail()
        .customSanitizer(somenteDigitos)
        .custom(cpfValido)
        .withMessage("Informe um CPF válido.");
};

/** Data de nascimento: AAAA-MM-DD que existe, não futura, dentro dos limites de `utils/validacoesPessoais.js`. */
export const campoDataNascimento = ({ obrigatorio = false } = {}) => {
    const regra = body("dataNascimento");

    if (!obrigatorio) {
        regra.optional({ values: "falsy" });
    }

    return regra
        .isString()
        .withMessage(MENSAGENS_DATA_NASCIMENTO.formato)
        .bail()
        .trim()
        .custom((valor) => {
            const resultado = validarDataNascimento(valor);

            if (!resultado.valida) {
                throw new Error(MENSAGENS_DATA_NASCIMENTO[resultado.motivo]);
            }

            return true;
        });
};

/** País: código ISO 3166-1 alpha-2 que existe de fato (gravado em maiúsculas), nunca o nome escrito. */
export const campoPais = ({ obrigatorio = false } = {}) => {
    const regra = body("pais");

    if (!obrigatorio) {
        regra.optional({ values: "falsy" });
    }

    return regra
        .isString()
        .withMessage("Escolha um país da lista.")
        .bail()
        .trim()
        .toUpperCase()
        .custom(ehCodigoDePais)
        .withMessage("Escolha um país da lista.");
};

/**
 * Estado: sigla de 2 letras. Para quem mora no Brasil (`pais` = BR na mesma requisição) tem de ser uma das
 * 27 UFs; para os demais países só o formato é conferido, porque o ACESSO não tem a lista de regiões deles.
 * Declare depois de `campoPais`, que já normaliza o país.
 */
export const campoEstado = ({ obrigatorio = false } = {}) => {
    const regra = body("estado");

    if (!obrigatorio) {
        regra.optional({ values: "falsy" });
    }

    return regra
        .isString()
        .withMessage("Use a sigla do estado com 2 letras (ex.: SP).")
        .bail()
        .trim()
        .toUpperCase()
        .matches(/^[A-Z]{2}$/)
        .withMessage("Use a sigla do estado com 2 letras (ex.: SP).")
        .bail()
        .custom((estado, { req }) => String(req.body.pais ?? "").trim().toUpperCase() !== "BR" || ehSiglaDeEstado(estado))
        .withMessage("Escolha um estado da lista.");
};
