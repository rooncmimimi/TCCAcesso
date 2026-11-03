import { UniqueConstraintError } from "sequelize";

import ErroApi from "./ErroApi.js";

const MENSAGEM_ERRO_CADASTRO = "Não foi possível concluir o cadastro agora. Tente novamente.";

/** Mensagem pronta para cada coluna única que um cadastro pode violar; a primeira que aparecer no erro vale. */
const MENSAGENS_DE_UNICIDADE = [
    ["google", "Esta conta Google já está vinculada a outra conta."],
    ["email", "Este e-mail já está cadastrado."],
    ["cpf", "Este CPF já está cadastrado."],
    ["cnpj", "Este CNPJ já está cadastrado."]
];

/**
 * Qual coluna única o banco acusou. Só os **nomes** (colunas e restrição) são lidos, nunca os valores,
 * e a mensagem devolvida é fixa: nada do erro do banco chega ao cliente.
 */
function mensagemDeUnicidade(erro) {
    const nomes = [
        ...Object.keys(erro.fields ?? {}),
        ...(erro.errors ?? []).map((item) => item.path ?? ""),
        erro.parent?.constraint ?? ""
    ]
        .join(" ")
        .toLowerCase();

    return (
        MENSAGENS_DE_UNICIDADE.find(([coluna]) => nomes.includes(coluna))?.[1] ??
        "Já existe um cadastro com estes dados."
    );
}

/**
 * Traduz o erro de um cadastro para o que o cliente deve receber.
 *
 * Erros esperados de regra de negócio (ErroApi, ex.: e-mail duplicado) já trazem mensagem amigável e
 * seguem como estão. A violação de uma coluna única do banco (duas requisições ao mesmo tempo, ou o
 * mesmo Google tentando criar uma segunda conta com outro e-mail) vira 409 com a mensagem da coluna.
 * Qualquer outra falha (ex.: erro inesperado de banco de dados) vira uma mensagem genérica e amigável;
 * a causa original continua sendo logada no servidor via `ErroApi.interno`.
 *
 * Vale para o cadastro por formulário e para a criação de conta direto pelo Google.
 */
export function tratarErroCadastro(erro) {
    if (erro instanceof ErroApi) return erro;

    if (erro instanceof UniqueConstraintError) return ErroApi.conflito(mensagemDeUnicidade(erro));

    return ErroApi.interno(MENSAGEM_ERRO_CADASTRO, erro);
}
