package com.acesso.app.modelos;

/** Candidatura da pessoa logada (GET /api/candidaturas/minhas no Site). */
public class Candidatura {

    public String id;
    public String vagaId;
    public String tituloVaga;
    public String nomeEmpresa;
    /** pendente, visualizada, em_analise, aprovada, rejeitada ou cancelada. */
    public String status;
    /** Texto pronto para exibir, ex.: "há 3 dias". */
    public String quando;
}
