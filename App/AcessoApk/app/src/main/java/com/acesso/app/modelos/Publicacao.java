package com.acesso.app.modelos;

/** Publicação do feed (tabela postagens do Site). */
public class Publicacao {

    public String id;
    public String nomeAutor;
    public TipoConta tipoAutor;
    /** Até 3000 caracteres, como no Site. */
    public String conteudo;
    /** Texto pronto para exibir, ex.: "há 2 horas". */
    public String quando;
    public int curtidas;
    public int comentarios;
}
