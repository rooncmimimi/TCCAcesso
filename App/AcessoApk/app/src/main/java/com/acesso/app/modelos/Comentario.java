package com.acesso.app.modelos;

import java.util.ArrayList;
import java.util.List;

/** Comentário de uma publicação (GET /api/postagens/:id/comentarios), com as respostas em um nível. */
public class Comentario {

    public String id;
    public String autorId;
    public String nomeAutor;
    public TipoConta tipoAutor;
    public String fotoAutorUrl;
    public String texto;
    /** Texto pronto para exibir, ex.: "há 2 horas". */
    public String quando;
    public boolean editado;
    public List<Comentario> respostas = new ArrayList<>();
}
