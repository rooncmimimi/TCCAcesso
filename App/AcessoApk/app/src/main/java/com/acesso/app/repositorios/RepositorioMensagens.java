package com.acesso.app.repositorios;

import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.Mensagem;
import com.acesso.app.modelos.PermissaoConversa;
import com.acesso.app.modelos.SessaoUsuario;

import java.util.List;

/**
 * Chat entre usuários, pelas mesmas rotas que o site usa (Site/Backend/src/routes/conversaRoutes.js).
 * Quem decide se a conta participa da conversa, se pode iniciar uma conversa nova (preferência de
 * mensagens, bloqueios) e se a empresa está aprovada é sempre a API.
 */
public interface RepositorioMensagens {

    /** GET /api/conversas (mais recentes primeiro, com a contagem de não lidas de cada uma). */
    void listarConversas(SessaoUsuario sessao, RetornoRepositorio<List<Conversa>> retorno);

    /** GET /api/conversas/nao-lidas (selo do ícone de mensagens). */
    void contarNaoLidas(SessaoUsuario sessao, RetornoRepositorio<Integer> retorno);

    /** GET /api/conversas/pode-iniciar/:usuarioId (estado do botão "Mensagem" no perfil). */
    void podeIniciar(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<PermissaoConversa> retorno);

    /** POST /api/conversas { usuarioId }: abre a conversa, ou recupera a que já existe com essa pessoa. */
    void abrirConversa(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<Conversa> retorno);

    /** GET /api/conversas/:id */
    void carregarConversa(SessaoUsuario sessao, String conversaId, RetornoRepositorio<Conversa> retorno);

    /** GET /api/conversas/:id/mensagens: as mais recentes, em ordem de envio. */
    void listarMensagens(SessaoUsuario sessao, String conversaId, RetornoRepositorio<List<Mensagem>> retorno);

    /** POST /api/conversas/:id/mensagens { conteudo } (1 a 2000 caracteres). */
    void enviar(SessaoUsuario sessao, String conversaId, String conteudo, RetornoRepositorio<Mensagem> retorno);

    /** PATCH /api/conversas/:id/mensagens/lidas */
    void marcarComoLidas(SessaoUsuario sessao, String conversaId, RetornoRepositorio<Void> retorno);
}
