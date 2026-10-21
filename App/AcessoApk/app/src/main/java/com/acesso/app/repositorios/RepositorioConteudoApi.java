package com.acesso.app.repositorios;

import android.content.Context;

import com.acesso.app.modelos.Candidatura;
import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.servicos.ClienteApi;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.TradutorErrosApi;
import com.google.gson.JsonObject;

import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

/**
 * Conteúdo das abas pela API do Site (Site/Backend, Express). Todas as chamadas são em nome
 * do usuário logado ({@link ExecutorHttp#executarComSessao}): o token é renovado sozinho.
 *
 * Rotas conferidas no código do backend (vagaRoutes, candidaturaRoutes, postagemRoutes, buscaRoutes,
 * dashboardRoutes, perfilRoutes e empresaRoutes). As listas pedem uma página de {@value #TAMANHO_PAGINA}
 * itens; "carregar mais" fica para depois.
 */
public class RepositorioConteudoApi implements RepositorioConteudo {

    static final int TAMANHO_PAGINA = 20;

    static final String AVISO_SEM_URL =
            "O endereço da API ainda não foi configurado (URL_API). Veja o README.";
    static final String AVISO_ID_INVALIDO = "Não foi possível abrir este item.";

    private final ExecutorHttp executor;
    private final MontadorRequisicao requisicoes;
    private final BooleanSupplier configurada;
    private final Supplier<Long> relogio;

    public RepositorioConteudoApi(Context contexto) {
        this(new ExecutorHttp(contexto, TradutorErrosApi::traduzir, RenovadorSessao.global(contexto)),
                ClienteApi.url(""), ClienteApi::estaConfigurada, System::currentTimeMillis);
    }

    /** Construtor sem Android, para os testes JUnit. */
    RepositorioConteudoApi(ExecutorHttp executor, String urlBase, BooleanSupplier configurada, Supplier<Long> relogio) {
        this.executor = executor;
        this.requisicoes = new MontadorRequisicao(urlBase);
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
                token -> requisicoes.get("postagens", token, "page", "1", "limit", String.valueOf(TAMANHO_PAGINA)),
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
                token -> requisicoes.get("vagas", token,
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
                token -> requisicoes.get("dashboard/empresa", token),
                new Encadeado<JsonObject, ResumoEmpresa>(retorno) {
                    @Override
                    public void aoConcluir(JsonObject dashboard) {
                        carregarVagasDaEmpresa(dashboard, retorno);
                    }
                },
                json -> json);
    }

    private void carregarVagasDaEmpresa(JsonObject dashboard, RetornoRepositorio<ResumoEmpresa> retorno) {
        executor.executarComSessao(
                token -> requisicoes.get("vagas/minhas", token, "page", "1", "limit", String.valueOf(TAMANHO_PAGINA)),
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
                token -> requisicoes.get("busca", token,
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
        executor.executarComSessao(token -> requisicoes.post("postagens", token, corpo), retorno, json -> null);
    }

    /** POST /api/vagas (só empresa aprovada; a API recusa as outras com 403) */
    @Override
    public void criarVaga(SessaoUsuario sessao, Vaga vaga, RetornoRepositorio<Void> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        JsonObject corpo = LeitoresConteudoApi.corpoVaga(vaga);
        executor.executarComSessao(token -> requisicoes.post("vagas", token, corpo), retorno, json -> null);
    }

    /**
     * GET /api/empresas/me (conta de empresa) ou GET /api/perfil/candidatos/usuario/:id (pessoa). A rota é
     * escolhida pelo tipo da sessão. Para a pessoa, /candidatos/me não traz experiências, formação nem
     * competências; a rota do perfil consolidado traz, e para o dono não esconde nada.
     */
    @Override
    public void carregarPerfil(SessaoUsuario sessao, RetornoRepositorio<PerfilConta> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        boolean empresa = sessao != null && sessao.ehEmpresa();
        if (!empresa && (sessao == null || !MontadorRequisicao.idValido(sessao.getIdUsuario()))) {
            executor.falhar(retorno, new FalhaHttp(AVISO_ID_INVALIDO));
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.get(empresa ? "empresas/me"
                        : "perfil/candidatos/usuario/" + sessao.getIdUsuario(), token),
                retorno,
                json -> LeitoresConteudoApi.perfil(json, empresa));
    }

    /** GET /api/perfil/usuario/:id (tipo da conta) e, conforme o tipo, o perfil de pessoa ou de empresa. */
    @Override
    public void carregarPerfilDeUsuario(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<PerfilConta> retorno) {
        if (!estaConfigurada(retorno) || !idValido(usuarioId, retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.get("perfil/usuario/" + usuarioId, token),
                new Encadeado<TipoConta, PerfilConta>(retorno) {
                    @Override
                    public void aoConcluir(TipoConta tipo) {
                        if (tipo == null) {
                            // Administrador: não tem perfil profissional para mostrar.
                            retorno.aoFalhar("Este perfil não está disponível no app.");
                            return;
                        }
                        boolean empresa = tipo == TipoConta.EMPRESA;
                        executor.executarComSessao(
                                token -> requisicoes.get(empresa ? "empresas/usuario/" + usuarioId
                                        : "perfil/candidatos/usuario/" + usuarioId, token),
                                retorno,
                                json -> LeitoresConteudoApi.perfil(json, empresa));
                    }
                },
                LeitoresConteudoApi::tipoDoUsuario);
    }

    /** GET /api/vagas/:id */
    @Override
    public void obterVaga(SessaoUsuario sessao, String vagaId, RetornoRepositorio<Vaga> retorno) {
        if (!estaConfigurada(retorno) || !idValido(vagaId, retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.get("vagas/" + vagaId, token),
                retorno,
                json -> LeitoresConteudoApi.vagaDetalhe(json, relogio.get()));
    }

    /** POST /api/vagas/:vagaId/candidaturas { mensagem? } */
    @Override
    public void candidatar(SessaoUsuario sessao, String vagaId, String mensagem, RetornoRepositorio<Void> retorno) {
        if (!estaConfigurada(retorno) || !idValido(vagaId, retorno)) {
            return;
        }
        JsonObject corpo = LeitoresConteudoApi.corpoCandidatura(mensagem);
        executor.executarComSessao(
                token -> requisicoes.post("vagas/" + vagaId + "/candidaturas", token, corpo), retorno, json -> null);
    }

    /** GET /api/candidaturas/minhas?page=1&limit=50 */
    @Override
    public void listarCandidaturas(SessaoUsuario sessao, RetornoRepositorio<List<Candidatura>> retorno) {
        if (!estaConfigurada(retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.get("candidaturas/minhas", token, "page", "1", "limit", "50"),
                retorno,
                json -> LeitoresConteudoApi.candidaturas(json, relogio.get()));
    }

    /** POST /api/postagens/:id/curtidas */
    @Override
    public void curtir(SessaoUsuario sessao, String publicacaoId, RetornoRepositorio<Publicacao.Curtida> retorno) {
        if (!estaConfigurada(retorno) || !idValido(publicacaoId, retorno)) {
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.post("postagens/" + publicacaoId + "/curtidas", token, new JsonObject()),
                retorno,
                LeitoresConteudoApi::curtida);
    }

    private <T> boolean estaConfigurada(RetornoRepositorio<T> retorno) {
        if (configurada.getAsBoolean()) {
            return true;
        }
        executor.falhar(retorno, new FalhaHttp(AVISO_SEM_URL));
        return false;
    }

    private <T> boolean idValido(String id, RetornoRepositorio<T> retorno) {
        if (MontadorRequisicao.idValido(id)) {
            return true;
        }
        executor.falhar(retorno, new FalhaHttp(AVISO_ID_INVALIDO));
        return false;
    }
}
