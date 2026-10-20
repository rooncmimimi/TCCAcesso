/**
 * País registrado em todo cadastro, em ISO 3166-1 alpha-2.
 *
 * O cadastro não pergunta o país: a plataforma opera no Brasil (CPF, CNPJ, UF e cidades do IBGE).
 * O backend ainda exige o código para criar um candidato, então o Site o envia sempre com este
 * valor. Se o ACESSO passar a atender outros países, o campo volta ao formulário e esta constante
 * deixa de ser usada.
 */
export const PAIS_PADRAO = "BR";
