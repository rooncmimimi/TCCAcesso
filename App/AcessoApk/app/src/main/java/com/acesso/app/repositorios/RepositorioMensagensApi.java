package com.acesso.app.repositorios;

import android.content.Context;

import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.Mensagem;
import com.acesso.app.modelos.PermissaoConversa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.servicos.ClienteApi;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.TradutorErrosApi;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

import okhttp3.Request;

/**
 * Chat pela API do Site. Usa só as rotas REST que o site já usa (mensagens.service.ts); o tempo real do
 * site (Socket.IO) não é usado no app: a tela da conversa consulta de novo a cada poucos segundos enquanto
 * está aberta (ver TelaConversa).
 */
public class RepositorioMensagensApi implements RepositorioMensagens {

    /** Máximo aceito pela API por página (paginacao.js). */
    static final int TAMANHO_PAGINA_MENSAGENS = 100;

    private final ExecutorHttp executor;
    private final MontadorRequisicao requisicoes;
    private final BooleanSupplier configurada;
    private final Supplier<Long> relogio;

    public RepositorioMensagensApi(Context contexto) {
        this(new ExecutorHttp(contexto, TradutorErrosApi::traduzir, RenovadorSessao.global(contexto)),
                ClienteApi.url(""), ClienteApi::estaConfigurada, System::currentTimeMillis);
    }

    /** Construtor sem Android, para os testes JUnit. */
    RepositorioMensagensApi(ExecutorHttp executor, String urlBase, BooleanSupplier configurada, Supplier<Long> relogio) {
        this.executor = executor;
        this.requisicoes = new MontadorRequisicao(urlBase);
        this.configurada = configurada;
        this.relogio = relogio;
    }

    @Override
    public void listarConversas(SessaoUsuario sessao, RetornoRepositorio<List<Conversa>> retorno) {
        if (!pronto(sessao, retorno)) {
            return;
        }
        String meuId = sessao.getIdUsuario();
        executor.executarComSessao(
                token -> requisicoes.get("conversas", token, "page", "1", "limit", "50"),
                retorno,
                json -> LeitoresConteudoApi.conversas(json, meuId, relogio.get()));
    }

    @Override
    public void contarNaoLidas(SessaoUsuario sessao, RetornoRepositorio<Integer> retorno) {
        if (!pronto(sessao, retorno)) {
            return;
        }
        executor.executarComSessao(token -> requisicoes.get("conversas/nao-lidas", token),
                retorno, LeitoresConteudoApi::naoLidas);
    }

    @Override
    public void podeIniciar(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<PermissaoConversa> retorno) {
        if (!pronto(sessao, usuarioId, retorno)) {
            return;
        }
        executor.executarComSessao(token -> requisicoes.get("conversas/pode-iniciar/" + usuarioId, token),
                retorno, LeitoresConteudoApi::permissao);
    }

    @Override
    public void abrirConversa(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<Conversa> retorno) {
        if (!pronto(sessao, usuarioId, retorno)) {
            return;
        }
        String meuId = sessao.getIdUsuario();
        JsonObject corpo = LeitoresConteudoApi.corpoConversa(usuarioId);
        executor.executarComSessao(token -> requisicoes.post("conversas", token, corpo),
                retorno, json -> LeitoresConteudoApi.conversaUnica(json, meuId, relogio.get()));
    }

    @Override
    public void carregarConversa(SessaoUsuario sessao, String conversaId, RetornoRepositorio<Conversa> retorno) {
        if (!pronto(sessao, conversaId, retorno)) {
            return;
        }
        String meuId = sessao.getIdUsuario();
        executor.executarComSessao(token -> requisicoes.get("conversas/" + conversaId, token),
                retorno, json -> LeitoresConteudoApi.conversaUnica(json, meuId, relogio.get()));
    }

    /**
     * A API devolve as mensagens da mais antiga para a mais nova, em páginas de até 100. A primeira página
     * basta na maioria das conversas; quando há mais, busca as duas últimas páginas (as mais recentes).
     */
    @Override
    public void listarMensagens(SessaoUsuario sessao, String conversaId, RetornoRepositorio<List<Mensagem>> retorno) {
        if (!pronto(sessao, conversaId, retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> paginaDeMensagens(conversaId, token, 1),
                new Encadeado<JsonObject, List<Mensagem>>(retorno) {
                    @Override
                    public void aoConcluir(JsonObject primeira) {
                        int totalPaginas = LeitoresConteudoApi.totalPaginas(primeira);
                        if (totalPaginas <= 1) {
                            retorno.aoConcluir(LeitoresConteudoApi.mensagens(primeira));
                        } else {
                            ultimasPaginas(conversaId, totalPaginas, retorno);
                        }
                    }
                },
                json -> json);
    }

    private void ultimasPaginas(String conversaId, int totalPaginas, RetornoRepositorio<List<Mensagem>> retorno) {
        executor.executarComSessao(
                token -> paginaDeMensagens(conversaId, token, totalPaginas - 1),
                new Encadeado<List<Mensagem>, List<Mensagem>>(retorno) {
                    @Override
                    public void aoConcluir(List<Mensagem> penultima) {
                        executor.executarComSessao(
                                token -> paginaDeMensagens(conversaId, token, totalPaginas),
                                retorno,
                                json -> {
                                    List<Mensagem> todas = new ArrayList<>(penultima);
                                    todas.addAll(LeitoresConteudoApi.mensagens(json));
                                    return todas;
                                });
                    }
                },
                LeitoresConteudoApi::mensagens);
    }

    private Request paginaDeMensagens(String conversaId, String token, int pagina) {
        return requisicoes.get("conversas/" + conversaId + "/mensagens", token,
                "page", String.valueOf(pagina), "limit", String.valueOf(TAMANHO_PAGINA_MENSAGENS));
    }

    @Override
    public void enviar(SessaoUsuario sessao, String conversaId, String conteudo, RetornoRepositorio<Mensagem> retorno) {
        if (!pronto(sessao, conversaId, retorno)) {
            return;
        }
        JsonObject corpo = LeitoresConteudoApi.corpoMensagem(conteudo);
        executor.executarComSessao(token -> requisicoes.post("conversas/" + conversaId + "/mensagens", token, corpo),
                retorno, LeitoresConteudoApi::mensagemEnviada);
    }

    @Override
    public void marcarComoLidas(SessaoUsuario sessao, String conversaId, RetornoRepositorio<Void> retorno) {
        if (!pronto(sessao, conversaId, retorno)) {
            return;
        }
        executor.executarComSessao(token -> requisicoes.patch("conversas/" + conversaId + "/mensagens/lidas", token),
                retorno, json -> null);
    }

    /** Confere a URL configurada e a sessão (o id da conta logada decide quem é "o outro" na conversa). */
    private <T> boolean pronto(SessaoUsuario sessao, RetornoRepositorio<T> retorno) {
        if (!configurada.getAsBoolean()) {
            executor.falhar(retorno, new FalhaHttp(RepositorioConteudoApi.AVISO_SEM_URL));
            return false;
        }
        if (sessao == null || sessao.getIdUsuario() == null) {
            executor.falhar(retorno, new FalhaHttp(RepositorioConteudoApi.AVISO_ID_INVALIDO));
            return false;
        }
        return true;
    }

    /** Como {@link #pronto(SessaoUsuario, RetornoRepositorio)}, conferindo também o id que vai no caminho. */
    private <T> boolean pronto(SessaoUsuario sessao, String id, RetornoRepositorio<T> retorno) {
        if (!pronto(sessao, retorno)) {
            return false;
        }
        if (!MontadorRequisicao.idValido(id)) {
            executor.falhar(retorno, new FalhaHttp(RepositorioConteudoApi.AVISO_ID_INVALIDO));
            return false;
        }
        return true;
    }
}
