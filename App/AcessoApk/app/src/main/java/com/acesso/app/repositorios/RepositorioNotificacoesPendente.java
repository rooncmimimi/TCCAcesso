package com.acesso.app.repositorios;

import com.acesso.app.modelos.Notificacao;
import com.acesso.app.modelos.SessaoUsuario;

import java.util.List;

/** Notificações fora da fonte "api": só existem na API do ACESSO, então a aba avisa isso. Contador em zero. */
public class RepositorioNotificacoesPendente implements RepositorioNotificacoes {

    private static final String DETALHE = "as notificações vêm da API do ACESSO (GET /api/notificacoes).";

    @Override
    public void listar(SessaoUsuario sessao, RetornoRepositorio<List<Notificacao>> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void contarNaoLidas(SessaoUsuario sessao, RetornoRepositorio<Integer> retorno) {
        RepositorioConteudoPendente.responder(() -> retorno.aoConcluir(0));
    }

    @Override
    public void marcarComoLida(SessaoUsuario sessao, String id, RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void marcarTodasComoLidas(SessaoUsuario sessao, RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }
}
