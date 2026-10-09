package com.acesso.app.modelos;

/**
 * Dados do cadastro de pessoa candidata, já validados e limpos (sem máscaras),
 * prontos para enviar. É o que sai da tela; cada repositório decide como enviar.
 *
 * Na API do Site (POST /api/auth/register/candidato) vão: nome, email, senha,
 * telefone e cpf. Cidade, data de nascimento e aceite dos termos são usados pelo
 * Supabase (tabela perfis) e ainda não são recebidos por essa rota da API.
 */
public class DadosCadastroPessoa {

    public String nome;
    public String email;
    public String senha;
    /** Opcional. null quando não informado. */
    public String telefone;
    /** Opcional, só os 11 dígitos. null quando não informado. */
    public String cpf;
    public String cidade;
    /** Opcional, formato aaaa-mm-dd. null quando não informada. */
    public String dataNascimentoIso;
    public boolean aceitouTermos;
}
