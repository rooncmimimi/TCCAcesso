package com.acesso.app.repositorios;

import java.util.Map;

/**
 * Resposta de uma operação assíncrona. Os métodos sempre são
 * chamados na thread principal, então podem mexer na tela direto.
 */
public interface RetornoRepositorio<T> {

    void aoConcluir(T resultado);

    /** @param mensagem mensagem já em português, pronta para mostrar ao usuário. */
    void aoFalhar(String mensagem);

    /**
     * Falha em que o servidor apontou campos específicos (ex.: "Este CNPJ já está cadastrado.").
     * Quem não trata erro por campo recebe só a mensagem geral.
     *
     * @param errosCampos nome do campo na API e a mensagem dele.
     */
    default void aoFalharComCampos(String mensagem, Map<String, String> errosCampos) {
        aoFalhar(mensagem);
    }

    /**
     * Falha com um código de {@link com.acesso.app.servicos.CodigosErro} (ex.: CONTA_BLOQUEADA).
     * Quem não distingue os códigos recebe só a mensagem.
     */
    default void aoFalharComCodigo(String mensagem, String codigo) {
        aoFalhar(mensagem);
    }
}
