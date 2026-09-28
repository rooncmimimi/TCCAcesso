package com.acesso.app.repositories;

/**
 * Resposta de uma operação assíncrona. Os dois métodos sempre são
 * chamados na thread principal, então podem mexer na tela direto.
 */
public interface RepositoryCallback<T> {

    void onSuccess(T result);

    /** @param message mensagem já em português, pronta para mostrar ao usuário. */
    void onError(String message);
}
