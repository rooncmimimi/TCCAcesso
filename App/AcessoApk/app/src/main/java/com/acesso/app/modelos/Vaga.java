package com.acesso.app.modelos;

import java.util.ArrayList;
import java.util.List;

/**
 * Vaga, com os mesmos campos e valores do Site (tabela vagas e
 * Site/Backend/src/validators/vagaValidator.js). Também serve para os dados
 * do formulário de nova vaga.
 */
public class Vaga {

    public String id;
    public String titulo;
    public String descricao;
    public String nomeEmpresa;
    public boolean empresaVerificada;
    /** presencial, hibrido ou remoto. */
    public String modalidade;
    /** clt, pj, estagio, jovem_aprendiz ou temporario. */
    public String contrato;
    /** geral, pcd, cinquenta_mais ou pcd_cinquenta_mais. */
    public String publicoAlvo;
    public String cidade;
    public String estado;
    /** aberta, pausada ou encerrada. */
    public String status;
    /** Valores de RECURSOS_ACESSIBILIDADE do Site, ex.: interprete_libras. */
    public List<String> recursosAcessibilidade = new ArrayList<>();
    /** Só no painel da empresa. */
    public int totalCandidaturas;
}
