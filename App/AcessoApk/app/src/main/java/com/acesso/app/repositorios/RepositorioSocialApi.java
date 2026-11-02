package com.acesso.app.repositorios;

import android.content.Context;

import com.acesso.app.modelos.Comentario;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.servicos.ClienteApi;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.TradutorErrosApi;
import com.google.gson.JsonObject;

import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;

/**
 * Comentários, edição de publicações, seguir, edição do perfil e envio de imagens pela API do Site
 * (Site/Backend, Express), em nome do usuário logado ({@link ExecutorHttp#executarComSessao}).
 */
public class RepositorioSocialApi implements RepositorioSocial {

    static final String AVISO_SEM_URL = RepositorioConteudoApi.AVISO_SEM_URL;
    static final String AVISO_ID_INVALIDO = RepositorioConteudoApi.AVISO_ID_INVALIDO;
    static final String TIPO_JPEG = "image/jpeg";
    private static final int TAMANHO_PAGINA_COMENTARIOS = 50;

    private final ExecutorHttp executor;
    private final MontadorRequisicao requisicoes;
    private final BooleanSupplier configurada;
    private final Supplier<Long> relogio;

    public RepositorioSocialApi(Context contexto) {
        this(new ExecutorHttp(contexto, TradutorErrosApi::traduzir, RenovadorSessao.global(contexto)),
                ClienteApi.url(""), ClienteApi::estaConfigurada, System::currentTimeMillis);
    }

    /** Construtor sem Android, para os testes JUnit. */
    RepositorioSocialApi(ExecutorHttp executor, String urlBase, BooleanSupplier configurada, Supplier<Long> relogio) {
        this.executor = executor;
        this.requisicoes = new MontadorRequisicao(urlBase);
        this.configurada = configurada;
        this.relogio = relogio;
    }

    @Override
    public void listarComentarios(SessaoUsuario sessao, String publicacaoId,
                                  RetornoRepositorio<List<Comentario>> retorno) {
        if (!pronto(retorno, publicacaoId)) {
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.get("postagens/" + publicacaoId + "/comentarios", token,
                        "page", "1", "limit", String.valueOf(TAMANHO_PAGINA_COMENTARIOS)),
                retorno,
                json -> LeitoresSocialApi.comentarios(json, relogio.get()));
    }

    @Override
    public void comentar(SessaoUsuario sessao, String publicacaoId, String texto, String comentarioPaiId,
                         RetornoRepositorio<Void> retorno) {
        if (!pronto(retorno, publicacaoId) || (comentarioPaiId != null && !idValido(comentarioPaiId, retorno))) {
            return;
        }
        JsonObject corpo = LeitoresSocialApi.corpoComentario(texto, comentarioPaiId);
        executor.executarComSessao(
                token -> requisicoes.post("postagens/" + publicacaoId + "/comentarios", token, corpo),
                retorno, json -> null);
    }

    @Override
    public void excluirComentario(SessaoUsuario sessao, String comentarioId, RetornoRepositorio<Void> retorno) {
        if (!pronto(retorno, comentarioId)) {
            return;
        }
        executor.executarComSessao(token -> requisicoes.delete("comentarios/" + comentarioId, token),
                retorno, json -> null);
    }

    @Override
    public void editarPublicacao(SessaoUsuario sessao, String publicacaoId, String conteudo,
                                 RetornoRepositorio<Void> retorno) {
        if (!pronto(retorno, publicacaoId)) {
            return;
        }
        JsonObject corpo = LeitoresSocialApi.corpoEdicaoPostagem(conteudo);
        executor.executarComSessao(token -> requisicoes.put("postagens/" + publicacaoId, token, corpo),
                retorno, json -> null);
    }

    @Override
    public void excluirPublicacao(SessaoUsuario sessao, String publicacaoId, RetornoRepositorio<Void> retorno) {
        if (!pronto(retorno, publicacaoId)) {
            return;
        }
        executor.executarComSessao(token -> requisicoes.delete("postagens/" + publicacaoId, token),
                retorno, json -> null);
    }

    @Override
    public void carregarResumoSeguidores(SessaoUsuario sessao, PerfilConta alvo,
                                         RetornoRepositorio<ResumoSeguidores> retorno) {
        boolean empresa = alvo != null && alvo.tipoConta == TipoConta.EMPRESA;
        String id = alvo == null ? null : (empresa ? alvo.registroId : alvo.usuarioId);
        if (!pronto(retorno, id)) {
            return;
        }
        executor.executarComSessao(
                token -> requisicoes.get(empresa ? "seguir/resumo/empresas/" + id : "seguir/resumo/" + id, token),
                retorno,
                empresa ? LeitoresSocialApi::resumoEmpresa : LeitoresSocialApi::resumoPessoa);
    }

    @Override
    public void alternarSeguir(SessaoUsuario sessao, PerfilConta alvo, ResumoSeguidores atual,
                               RetornoRepositorio<ResumoSeguidores> retorno) {
        boolean empresa = alvo != null && alvo.tipoConta == TipoConta.EMPRESA;
        String id = alvo == null ? null : (empresa ? alvo.registroId : alvo.usuarioId);
        if (!pronto(retorno, id)) {
            return;
        }
        JsonObject vazio = new JsonObject();
        if (empresa) {
            executor.executarComSessao(token -> requisicoes.post("seguir/empresas/" + id, token, vazio),
                    retorno, json -> LeitoresSocialApi.aposAlternar(json, atual));
        } else if (atual != null && atual.seguindo) {
            executor.executarComSessao(token -> requisicoes.post("seguir/usuarios/" + id, token, vazio),
                    retorno, json -> LeitoresSocialApi.aposAlternar(json, atual));
        } else if (atual != null && atual.solicitacaoPendente) {
            executor.executarComSessao(token -> requisicoes.delete("seguir/solicitacoes/" + id, token),
                    retorno, json -> LeitoresSocialApi.aposSolicitar(json, atual));
        } else {
            // Em perfil público a API segue direto; em privado cria o pedido.
            executor.executarComSessao(token -> requisicoes.post("seguir/solicitacoes/" + id, token, vazio),
                    retorno, json -> LeitoresSocialApi.aposSolicitar(json, atual));
        }
    }

    @Override
    public void atualizarPerfil(SessaoUsuario sessao, EdicaoPerfil edicao, RetornoRepositorio<Void> retorno) {
        if (!pronto(retorno, edicao.registroId) || !idValido(edicao.usuarioId, retorno)) {
            return;
        }
        boolean empresa = edicao.tipoConta == TipoConta.EMPRESA;
        JsonObject corpoRegistro = LeitoresSocialApi.corpoRegistro(edicao);
        String rotaRegistro = (empresa ? "empresas/" : "candidatos/") + edicao.registroId;
        if (empresa) {
            // O nome da empresa é o nome fantasia, que vive no registro da empresa.
            executor.executarComSessao(token -> requisicoes.put(rotaRegistro, token, corpoRegistro),
                    retorno, json -> null);
            return;
        }
        JsonObject corpoUsuario = LeitoresSocialApi.corpoUsuario(edicao);
        executor.executarComSessao(
                token -> requisicoes.put("usuarios/" + edicao.usuarioId, token, corpoUsuario),
                new Encadeado<JsonObject, Void>(retorno) {
                    @Override
                    public void aoConcluir(JsonObject ignorado) {
                        executor.executarComSessao(token -> requisicoes.put(rotaRegistro, token, corpoRegistro),
                                retorno, json -> null);
                    }
                },
                json -> json);
    }

    @Override
    public void enviarImagem(SessaoUsuario sessao, Imagem imagem, String destinoId, byte[] jpeg,
                             RetornoRepositorio<String> retorno) {
        if (!pronto(retorno, destinoId)) {
            return;
        }
        String rota;
        String campo;
        String objeto;
        String atributo;
        switch (imagem) {
            case FOTO_PERFIL:
                rota = "usuarios/" + destinoId + "/foto";
                campo = "foto";
                objeto = "usuario";
                atributo = "fotoPerfil";
                break;
            case CAPA_PERFIL:
                rota = "usuarios/" + destinoId + "/capa";
                campo = "capa";
                objeto = "usuario";
                atributo = "capaPerfil";
                break;
            case LOGO_EMPRESA:
                rota = "empresas/" + destinoId + "/logo";
                campo = "logo";
                objeto = "empresa";
                atributo = "logo";
                break;
            default:
                rota = "empresas/" + destinoId + "/capa";
                campo = "capa";
                objeto = "empresa";
                atributo = "capa";
                break;
        }
        String caminho = rota;
        String campoArquivo = campo;
        String objetoResposta = objeto;
        String atributoResposta = atributo;
        executor.executarComSessao(
                token -> requisicoes.patchArquivo(caminho, token, campoArquivo, campoArquivo + ".jpg", TIPO_JPEG, jpeg),
                retorno,
                json -> LeitoresSocialApi.urlEnviada(json, objetoResposta, atributoResposta));
    }

    private <T> boolean pronto(RetornoRepositorio<T> retorno, String id) {
        if (!configurada.getAsBoolean()) {
            executor.falhar(retorno, new FalhaHttp(AVISO_SEM_URL));
            return false;
        }
        return idValido(id, retorno);
    }

    private <T> boolean idValido(String id, RetornoRepositorio<T> retorno) {
        if (MontadorRequisicao.idValido(id)) {
            return true;
        }
        executor.falhar(retorno, new FalhaHttp(AVISO_ID_INVALIDO));
        return false;
    }
}
