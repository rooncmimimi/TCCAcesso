package com.acesso.app.repositorios;

import com.acesso.app.modelos.Notificacao;
import com.acesso.app.modelos.SessaoUsuario;

import java.util.List;

/** Notificações da conta logada (Site/Backend/src/routes/notificacaoRoutes.js), as mesmas do sino do site. */
public interface RepositorioNotificacoes {

    /** GET /api/notificacoes (mais recentes primeiro). */
    void listar(SessaoUsuario sessao, RetornoRepositorio<List<Notificacao>> retorno);

    /** GET /api/notificacoes/nao-lidas (selo da aba). */
    void contarNaoLidas(SessaoUsuario sessao, RetornoRepositorio<Integer> retorno);

    /** PATCH /api/notificacoes/:id/lida */
    void marcarComoLida(SessaoUsuario sessao, String id, RetornoRepositorio<Void> retorno);

    /** PATCH /api/notificacoes/lidas */
    void marcarTodasComoLidas(SessaoUsuario sessao, RetornoRepositorio<Void> retorno);
}
