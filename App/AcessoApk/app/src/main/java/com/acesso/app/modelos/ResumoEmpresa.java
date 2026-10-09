package com.acesso.app.modelos;

import java.util.ArrayList;
import java.util.List;

/** Números e vagas do painel da empresa (GET /api/dashboard/empresa e GET /api/vagas/minhas no Site). */
public class ResumoEmpresa {

    public int vagasPublicadas;
    public int vagasAbertas;
    public int candidaturas;
    public int seguidores;
    public List<Vaga> vagas = new ArrayList<>();
}
