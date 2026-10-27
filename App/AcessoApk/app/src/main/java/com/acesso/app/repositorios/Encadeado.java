package com.acesso.app.repositorios;

import java.util.Map;

/**
 * Primeira etapa de uma operação feita em duas chamadas (ex.: descobrir o tipo da conta e depois
 * buscar o perfil). Quem estende só trata o sucesso; qualquer falha vai direto, sem perder o código
 * nem os erros por campo, para o retorno final.
 */
abstract class Encadeado<A, B> implements RetornoRepositorio<A> {

    private final RetornoRepositorio<B> finalDaCadeia;

    Encadeado(RetornoRepositorio<B> finalDaCadeia) {
        this.finalDaCadeia = finalDaCadeia;
    }

    @Override
    public void aoFalhar(String mensagem) {
        finalDaCadeia.aoFalhar(mensagem);
    }

    @Override
    public void aoFalharComCampos(String mensagem, Map<String, String> errosCampos) {
        finalDaCadeia.aoFalharComCampos(mensagem, errosCampos);
    }

    @Override
    public void aoFalharComCodigo(String mensagem, String codigo) {
        finalDaCadeia.aoFalharComCodigo(mensagem, codigo);
    }
}
