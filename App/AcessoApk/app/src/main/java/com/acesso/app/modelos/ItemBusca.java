package com.acesso.app.modelos;

/** Um resultado da pesquisa (pessoa, empresa ou vaga), como em GET /api/busca do Site. */
public class ItemBusca {

    public enum Categoria { PESSOAS, EMPRESAS, VAGAS }

    public String id;
    /** Pessoas e empresas: a conta (usuário) que abre o perfil. Vagas: nulo. */
    public String usuarioId;
    public Categoria categoria;
    public String titulo;
    public String subtitulo;
}
