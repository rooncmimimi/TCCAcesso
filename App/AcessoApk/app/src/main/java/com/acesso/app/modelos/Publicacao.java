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
    public String fotoAutorUrl;
    public boolean editada;
    /** Imagens anexadas (outras mídias não aparecem no app). */
    public java.util.List<Anexo> anexos = new java.util.ArrayList<>();

    /** Imagem da publicação; {@code descricao} é o texto alternativo escrito por quem publicou. */
    public static class Anexo {
        public String id;
        public String url;
        public String descricao;
    }

    /** Resposta de POST /postagens/:id/curtidas (curtir e descurtir são a mesma rota). */
    public static class Curtida {
        public boolean curtido;
        public int total;
    }
}
