package com.acesso.app.modelos;

/** Publicação do feed (tabela postagens do Site). */
public class Publicacao {

    public String id;
    /** Usuário que publicou: abre o perfil dele. */
    public String autorId;
    public String nomeAutor;
    public TipoConta tipoAutor;
    /** Até 3000 caracteres, como no Site. */
    public String conteudo;
    /** Texto pronto para exibir, ex.: "há 2 horas". */
    public String quando;
    public int curtidas;
    public int comentarios;
    public boolean curtidoPorMim;

    /** Resposta de POST /postagens/:id/curtidas (curtir e descurtir são a mesma rota). */
    public static class Curtida {
        public boolean curtido;
        public int total;
    }
}
