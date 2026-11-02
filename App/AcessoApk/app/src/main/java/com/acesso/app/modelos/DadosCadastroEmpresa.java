package com.acesso.app.modelos;

/**
 * Dados do cadastro de empresa, já validados e limpos (sem máscaras).
 * Os nomes seguem os campos de POST /api/auth/register/empresa do Site
 * (Site/Backend/src/validators/autenticacaoValidator.js). Campos opcionais
 * ficam null quando não informados e não são enviados.
 */
public class DadosCadastroEmpresa {

    /** Nome da pessoa responsável pela conta. */
    public String nome;
    public String email;
    public String senha;
    public String telefone;
    /** Só os 14 dígitos. */
    public String cnpj;
    public String razaoSocial;
    public String nomeFantasia;
    public String setor;
    /** mei, micro, pequena, media ou grande. */
    public String porte;
    public String site;
    public String descricao;
    public String cidade;
    /** Sigla com 2 letras maiúsculas. */
    public String estado;
    public String endereco;
    /** Só os 8 dígitos. */
    public String cep;
    public boolean aceitouTermos;
}
