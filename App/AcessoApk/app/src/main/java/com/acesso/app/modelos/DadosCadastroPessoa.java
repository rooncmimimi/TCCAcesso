package com.acesso.app.modelos;

/**
 * Dados do cadastro de pessoa candidata, já validados e limpos (sem máscaras),
 * prontos para enviar. É o que sai da tela; cada repositório decide como enviar.
 *
 * Na API do Site (POST /api/auth/register/candidato) vão: nome, email, senha, telefone, cpf,
 * pais, dataNascimento, cidade e estado — todos obrigatórios na API. O aceite dos termos é
 * conferido na tela; cidade e data de nascimento também são usados pelo Supabase (tabela perfis).
 */
public class DadosCadastroPessoa {

    /**
     * País enviado à API (ISO 3166-1 alpha-2). O app é só em português e pede CPF e UF, então é
     * sempre o Brasil — o mesmo que o Site faz (PAIS_PADRAO em dados/localidade.ts).
     */
    public static final String PAIS_PADRAO = "BR";

    public String nome;
    public String email;
    public String senha;
    /** Só dígitos, com DDD. */
    public String telefone;
    /** Só os 11 dígitos. */
    public String cpf;
    public String cidade;
    /** Sigla da UF em maiúsculas, por exemplo SP. */
    public String estado;
    /** Formato aaaa-mm-dd. */
    public String dataNascimentoIso;
    public boolean aceitouTermos;
}
