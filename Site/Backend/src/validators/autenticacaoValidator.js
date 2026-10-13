import { body } from "express-validator";

/**
 * Regras de senha forte (OWASP ASVS 2.1): de 8 a 72 caracteres, com maiúscula, minúscula, número e
 * símbolo. É exportada para `validarRedefinirSenha` (`sessaoValidator.js`) usar exatamente as
 * mesmas regras do cadastro e da troca de senha.
 */
export const regrasSenha = (campo = "senha") =>
    body(campo)
        .isString()
        .isLength({ min: 8, max: 72 })
        .withMessage("A senha deve ter entre 8 e 72 caracteres.")
        .matches(/[a-z]/)
        .withMessage("A senha deve conter ao menos uma letra minúscula.")
        .matches(/[A-Z]/)
        .withMessage("A senha deve conter ao menos uma letra maiúscula.")
        .matches(/\d/)
        .withMessage("A senha deve conter ao menos um número.")
        .matches(/[^A-Za-z0-9]/)
        .withMessage("A senha deve conter ao menos um caractere especial.");

const regrasComuns = [
    // Código de entrega do Google, quando o cadastro veio de "Continuar com Google". O servidor o
    // verifica; o cliente não tem como forjar o `sub` que ele carrega.
    body("googleCodigo").optional({ values: "falsy" }).isString(),

    // Rótulo da versão dos documentos legais que a tela mostrou, gravado junto do aceite.
    body("termosVersao").optional({ values: "falsy" }).trim().isLength({ max: 20 }),

    body("nome")
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage("Informe um nome entre 3 e 150 caracteres."),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Informe um endereço de e-mail válido.")
        .isLength({ max: 150 })
        .normalizeEmail(),

    body("telefone")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ min: 10, max: 20 })
        .withMessage("Informe um telefone válido."),

    regrasSenha("senha")
];

/**
 * Cadastro de candidato: as duas primeiras etapas do wizard chegam juntas, e **todo** campo de dado
 * é obrigatório. Foto de perfil e currículo não entram aqui — são os dois opcionais, e vêm depois.
 *
 * O asterisco da tela não vale como validação: estas regras são a validação de verdade, e o
 * frontend repete as mesmas mensagens só para errar antes da viagem.
 */
export const validarCadastroCandidato = [
    ...regrasComuns,

    // `regrasComuns` deixa o telefone opcional porque empresa também o usa; para candidato ele é
    // obrigatório, e esta regra roda junto da outra.
    body("telefone").trim().notEmpty().withMessage("Informe seu telefone."),

    body("cpf")
        .trim()
        .matches(/^\d{11}$/)
        .withMessage("Informe um CPF válido."),

    // Código ISO 3166-1 alpha-2 (veja o model Candidato).
    body("pais")
        .trim()
        .toUpperCase()
        .matches(/^[A-Z]{2}$/)
        .withMessage("Use o código do país com 2 letras (ex.: BR)."),

    body("dataNascimento")
        .trim()
        .isISO8601()
        .withMessage("Informe uma data de nascimento válida (AAAA-MM-DD).")
        .bail()
        .custom((valor) => new Date(valor) <= new Date())
        .withMessage("A data de nascimento não pode estar no futuro."),

    body("cidade")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Informe a cidade onde você mora."),

    body("estado")
        .trim()
        .toUpperCase()
        .matches(/^[A-Z]{2}$/)
        .withMessage("Use a sigla do estado com 2 letras (ex.: SP).")
];

export const validarCadastroEmpresa = [
    ...regrasComuns,

    body("cnpj")
        .trim()
        .matches(/^\d{14}$/)
        .withMessage("Informe um CNPJ válido."),

    body("razaoSocial")
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Informe a razão social (3 a 200 caracteres)."),

    body("nomeFantasia")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 200 }),

    // Campos opcionais: cadastro reutiliza os mesmos limites do model
    // Empresa e do fluxo de edição de perfil (EditarEmpresaDialog).
    body("setor").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
    body("porte")
        .optional({ values: "falsy" })
        .isIn(["mei", "micro", "pequena", "media", "grande"])
        .withMessage("Porte inválido."),
    body("site")
        .optional({ values: "falsy" })
        .trim()
        .isURL({ require_protocol: true })
        .withMessage("Informe uma URL válida (começando com http:// ou https://)."),
    body("descricao").optional({ values: "falsy" }).trim().isLength({ max: 4000 }),
    body("cidade").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
    body("estado").optional({ values: "falsy" }).trim().isLength({ min: 2, max: 2 }).withMessage("Informe a UF com 2 letras."),
    body("endereco").optional({ values: "falsy" }).trim().isLength({ max: 255 }),
    body("cep")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Informe um CEP válido (8 dígitos)."),

    // País da sede, no mesmo formato de `candidatos.pais`: ISO 3166-1 alpha-2.
    body("pais")
        .optional({ values: "falsy" })
        .trim()
        .toUpperCase()
        .matches(/^[A-Z]{2}$/)
        .withMessage("Use o código do país com 2 letras (ex.: BR)."),

    // Como a empresa pratica inclusão; aparece no perfil institucional.
    body("culturaInclusiva").optional({ values: "falsy" }).trim().isLength({ max: 4000 })
];

export const validarLogin = [
    body("email").trim().isEmail().withMessage("Informe um endereço de e-mail válido."),

    body("senha").isString().notEmpty().withMessage("Informe a senha.")
];

export const validarTrocaSenha = [
    body("senhaAtual").isString().notEmpty().withMessage("Informe a senha atual."),

    regrasSenha("novaSenha")
];
