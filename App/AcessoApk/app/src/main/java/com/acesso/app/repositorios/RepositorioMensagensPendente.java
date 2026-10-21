package com.acesso.app.repositorios;

import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.Mensagem;
import com.acesso.app.modelos.PermissaoConversa;
import com.acesso.app.modelos.SessaoUsuario;

import java.util.List;

/**
 * Mensagens fora da fonte "api" (Supabase ou modo demonstração): as conversas só existem na API do
 * ACESSO, então cada tela avisa isso em vez de mostrar conversas inventadas. O contador fica em zero.
 */
public class RepositorioMensagensPendente implements RepositorioMensagens {

    private static final String DETALHE = "as mensagens usam a API do ACESSO (GET /api/conversas). "
            + "Entre com FONTE_AUTENTICACAO=api para conversar.";

    @Override
    public void listarConversas(SessaoUsuario sessao, RetornoRepositorio<List<Conversa>> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void contarNaoLidas(SessaoUsuario sessao, RetornoRepositorio<Integer> retorno) {
        RepositorioConteudoPendente.responder(() -> retorno.aoConcluir(0));
    }

    @Override
    public void podeIniciar(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<PermissaoConversa> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void abrirConversa(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<Conversa> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void carregarConversa(SessaoUsuario sessao, String conversaId, RetornoRepositorio<Conversa> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void listarMensagens(SessaoUsuario sessao, String conversaId, RetornoRepositorio<List<Mensagem>> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void enviar(SessaoUsuario sessao, String conversaId, String conteudo, RetornoRepositorio<Mensagem> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE + " Nada foi enviado.");
    }

    @Override
    public void marcarComoLidas(SessaoUsuario sessao, String conversaId, RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }
}
