package com.acesso.app.repositorios;

/**
 * Resposta de uma operação assíncrona. Os dois métodos sempre são
 * chamados na thread principal, então podem mexer na tela direto.
 */
public interface RetornoRepositorio<T> {

    void aoConcluir(T resultado);

    /** @param mensagem mensagem já em português, pronta para mostrar ao usuário. */
    void aoFalhar(String mensagem);
}
