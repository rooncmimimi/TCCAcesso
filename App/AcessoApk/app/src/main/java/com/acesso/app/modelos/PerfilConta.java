package com.acesso.app.modelos;

/**
 * Perfil da conta como o servidor devolve (GET /api/candidatos/me ou GET /api/empresas/me).
 * Só os campos que o cartão do Perfil mostra; CPF, CNPJ, endereço e outros dados sensíveis
 * do cadastro não são lidos.
 */
public class PerfilConta {

    /** Nome para exibir: o da pessoa, ou o nome fantasia (ou razão social) da empresa. */
    public String nome;
    /** Pessoa: "Título profissional · Cidade - UF". Empresa: sem uso. Pode ser nulo. */
    public String detalhe;
    /** Empresa: statusAprovacao (pendente, aprovada...). Pessoa: nulo. */
    public String statusEmpresa;
}
