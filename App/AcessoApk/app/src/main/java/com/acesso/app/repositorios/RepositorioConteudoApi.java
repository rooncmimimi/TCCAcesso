package com.acesso.app.repositorios;

import android.content.Context;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.servicos.ClienteApi;
import com.acesso.app.servicos.ClienteHttp;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.TradutorErrosApi;
import com.google.gson.JsonObject;

import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

import okhttp3.HttpUrl;
import okhttp3.Request;
import okhttp3.RequestBody;

/**
 * Conteúdo das abas pela API do Site (Site/Backend, Express). Todas as chamadas são em nome
 * do usuário logado ({@link ExecutorHttp#executarComSessao}): o token é renovado sozinho.
 *
 * Rotas conferidas no código do backend (vagaRoutes, postagemRoutes, buscaRoutes e
 * dashboardRoutes). Ainda não foi testado contra a API rodando, só contra servidor de mentira.
 * As listas pedem uma página de {@value #TAMANHO_PAGINA} itens; "carregar mais" fica para depois.
 */
public class RepositorioConteudoApi implements RepositorioConteudo {

    static final int TAMANHO_PAGINA = 20;

    private static final String AVISO_SEM_URL =
            "O endereço da API ainda não foi configurado (URL_API). Veja o README.";

    private final ExecutorHttp executor;
    private final String urlBase;
    private final BooleanSupplier configurada;
    private final Supplier<Long> relogio;

    public RepositorioConteudoApi(Context contexto) {
        this(new ExecutorHttp(contexto, TradutorErrosApi::traduzir, RenovadorSessao.global(contexto)),
                ClienteApi.url(""), ClienteApi::estaConfigurada, System::currentTimeMillis);
    }

    /** Construtor sem Android, para os testes JUnit. */
    RepositorioConteudoApi(ExecutorHttp executor, String urlBase, BooleanSupplier configurada, Supplier<Long> relogio) {
        this.executor = executor;
        this.urlBase = urlBase;
        this.configurada = configurada;
        this.relogio = relogio;
    }

    /** GET /api/postagens?page=1&limit=20 */
    @Override
    public void listarPublicacoes(SessaoUsuario sessao, RetornoRepositorio<List<Publicacao>> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> get("postagens", token, "page", "1", "limit", String.valueOf(TAMANHO_PAGINA)),
                retorno,
                json -> LeitoresConteudoApi.publicacoes(json, relogio.get()));
    }

    /** GET /api/vagas?search=&modalidade=&publicoAlvo=&page=1&limit=20 (rota pública; o token segue junto). */
    @Override
    public void listarVagas(SessaoUsuario sessao, String busca, String modalidade, String publicoAlvo,
                            RetornoRepositorio<List<Vaga>> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> get("vagas", token,
                        "search", busca,
                        "modalidade", modalidade,
                        "publicoAlvo", publicoAlvo,
                        "page", "1",
                        "limit", String.valueOf(TAMANHO_PAGINA)),
                retorno,
                LeitoresConteudoApi::vagas);
    }

    /** GET /api/dashboard/empresa e, em seguida, GET /api/vagas/minhas?page=1&limit=20. */
    @Override
    public void carregarResumoEmpresa(SessaoUsuario sessao, RetornoRepositorio<ResumoEmpresa> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> get("dashboard/empresa", token),
                new RetornoRepositorio<JsonObject>() {
                    @Override
                    public void aoConcluir(JsonObject dashboard) {
                        carregarVagasDaEmpresa(dashboard, retorno);
                    }

                    @Override
                    public void aoFalhar(String mensagem) {
                        retorno.aoFalhar(mensagem);
                    }

                    @Override
                    public void aoFalharComCodigo(String mensagem, String codigo) {
                        retorno.aoFalharComCodigo(mensagem, codigo);
                    }
                },
                json -> json);
    }

    private void carregarVagasDaEmpresa(JsonObject dashboard, RetornoRepositorio<ResumoEmpresa> retorno) {
        executor.executarComSessao(
                token -> get("vagas/minhas", token, "page", "1", "limit", String.valueOf(TAMANHO_PAGINA)),
                retorno,
                vagas -> LeitoresConteudoApi.resumoEmpresa(dashboard, vagas));
    }

    /** GET /api/busca?q=&tipo=usuarios|empresas|vagas&page=1&limit=20 */
    @Override
    public void buscar(SessaoUsuario sessao, String termo, ItemBusca.Categoria categoria,
                       RetornoRepositorio<List<ItemBusca>> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> get("busca", token,
                        "q", termo,
                        "tipo", LeitoresConteudoApi.tipoDaBusca(categoria),
                        "page", "1",
                        "limit", String.valueOf(TAMANHO_PAGINA)),
                retorno,
                json -> LeitoresConteudoApi.busca(json, categoria));
    }

    /** POST /api/postagens { conteudo } */
    @Override
    public void publicar(SessaoUsuario sessao, String conteudo, RetornoRepositorio<Void> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        JsonObject corpo = LeitoresConteudoApi.corpoPostagem(conteudo);
        executor.executarComSessao(token -> post("postagens", token, corpo), retorno, json -> null);
    }

    /** POST /api/vagas (só empresa aprovada; a API recusa as outras com 403) */
    @Override
    public void criarVaga(SessaoUsuario sessao, Vaga vaga, RetornoRepositorio<Void> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        JsonObject corpo = LeitoresConteudoApi.corpoVaga(vaga);
        executor.executarComSessao(token -> post("vagas", token, corpo), retorno, json -> null);
    }

    /**
     * GET /api/empresas/me (conta de empresa) ou GET /api/candidatos/me (pessoa). A rota é escolhida
     * pelo tipo da sessão, porque /candidatos/me não confere o tipo e devolveria 404 para empresa.
     */
    @Override
    public void carregarPerfil(SessaoUsuario sessao, RetornoRepositorio<PerfilConta> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        boolean empresa = sessao != null && sessao.ehEmpresa();
        executor.executarComSessao(
                token -> get(empresa ? "empresas/me" : "candidatos/me", token),
                retorno,
                json -> LeitoresConteudoApi.perfil(json, empresa));
    }

    private <T> boolean estaConfigurada(RetornoRepositorio<T> retorno) {
        if (configurada.getAsBoolean()) {
            return true;
        }
        executor.falhar(retorno, new FalhaHttp(AVISO_SEM_URL));
        return false;
    }

    /** {@code parametros} são pares chave, valor; valores nulos ou vazios ficam de fora. */
    private Request get(String caminho, String token, String... parametros) {
        return construir(caminho, token, parametros).get().build();
    }

    private Request post(String caminho, String token, JsonObject corpo) {
        return construir(caminho, token).post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON)).build();
    }

    private Request.Builder construir(String caminho, String token, String... parametros) {
        HttpUrl.Builder url = HttpUrl.get(urlBase + caminho).newBuilder();
        for (int i = 0; i + 1 < parametros.length; i += 2) {
            String valor = parametros[i + 1];
            if (valor != null && !valor.trim().isEmpty()) {
                url.addQueryParameter(parametros[i], valor.trim());
            }
        }
        return new Request.Builder()
                .url(url.build())
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + token);
    }
}
