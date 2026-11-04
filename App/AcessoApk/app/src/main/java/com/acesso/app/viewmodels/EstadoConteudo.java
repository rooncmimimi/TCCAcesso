package com.acesso.app.viewmodels;

import com.acesso.app.repositorios.RepositorioConteudoPendente;

/**
 * Estado de uma área de conteúdo (lista, painel, envio): carregando, pronto com
 * dados, ou com uma mensagem. A mensagem pode ser um aviso de "integração pendente"
 * (não é erro: o conteúdo ainda depende da API) ou um erro de verdade (rede, servidor).
 */
public class EstadoConteudo<T> {

    public final boolean carregando;
    public final T dados;
    public final String mensagem;

    private EstadoConteudo(boolean carregando, T dados, String mensagem) {
        this.carregando = carregando;
        this.dados = dados;
        this.mensagem = mensagem;
    }

    public static <T> EstadoConteudo<T> carregando() {
        return new EstadoConteudo<>(true, null, null);
    }

    public static <T> EstadoConteudo<T> pronto(T dados) {
        return new EstadoConteudo<>(false, dados, null);
    }

    public static <T> EstadoConteudo<T> comMensagem(String mensagem) {
        return new EstadoConteudo<>(false, null, mensagem);
    }

    /** true quando a mensagem só avisa que a integração com a API ainda não foi feita. */
    public boolean integracaoPendente() {
        return mensagem != null && mensagem.startsWith(RepositorioConteudoPendente.PREFIXO);
    }
}
