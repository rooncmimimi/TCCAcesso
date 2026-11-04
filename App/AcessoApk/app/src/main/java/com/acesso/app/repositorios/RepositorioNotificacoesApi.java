package com.acesso.app.repositorios;

import android.content.Context;

import com.acesso.app.modelos.Notificacao;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.servicos.ClienteApi;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.TradutorErrosApi;

import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

/** Notificações pela API do Site (as mesmas rotas de notificacoes.service.ts). */
public class RepositorioNotificacoesApi implements RepositorioNotificacoes {

    private final ExecutorHttp executor;
    private final MontadorRequisicao requisicoes;
    private final BooleanSupplier configurada;
    private final Supplier<Long> relogio;

    public RepositorioNotificacoesApi(Context contexto) {
        this(new ExecutorHttp(contexto, TradutorErrosApi::traduzir, RenovadorSessao.global(contexto)),
                ClienteApi.url(""), ClienteApi::estaConfigurada, System::currentTimeMillis);
    }

    /** Construtor sem Android, para os testes JUnit. */
    RepositorioNotificacoesApi(ExecutorHttp executor, String urlBase, BooleanSupplier configurada, Supplier<Long> relogio) {
        this.executor = executor;
        this.requisicoes = new MontadorRequisicao(urlBase);
        this.configurada = configurada;
        this.relogio = relogio;
    }

    @Override
    public void listar(SessaoUsuario sessao, RetornoRepositorio<List<Notificacao>> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.get("notificacoes", token, "page", "1", "limit", "50"),
                retorno,
                json -> LeitoresConteudoApi.notificacoes(json, relogio.get()));
    }

    @Override
    public void contarNaoLidas(SessaoUsuario sessao, RetornoRepositorio<Integer> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(token -> requisicoes.get("notificacoes/nao-lidas", token),
                retorno, LeitoresConteudoApi::naoLidas);
    }

    @Override
    public void marcarComoLida(SessaoUsuario sessao, String id, RetornoRepositorio<Void> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        if (!MontadorRequisicao.idValido(id)) {
            executor.falhar(retorno, new FalhaHttp(RepositorioConteudoApi.AVISO_ID_INVALIDO));
            return;
        }
        executor.executarComSessao(token -> requisicoes.patch("notificacoes/" + id + "/lida", token),
                retorno, json -> null);
    }

    @Override
    public void marcarTodasComoLidas(SessaoUsuario sessao, RetornoRepositorio<Void> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(token -> requisicoes.patch("notificacoes/lidas", token), retorno, json -> null);
    }

    private <T> boolean estaConfigurada(RetornoRepositorio<T> retorno) {
        if (configurada.getAsBoolean()) {
            return true;
        }
        executor.falhar(retorno, new FalhaHttp(RepositorioConteudoApi.AVISO_SEM_URL));
        return false;
    }
}
