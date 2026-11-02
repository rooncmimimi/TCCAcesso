package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Comentario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioSocial;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;
import java.util.function.Consumer;

/** Comentários de uma publicação: lista (com respostas), enviar e excluir. */
public class ViewModelComentarios extends AndroidViewModel {

    private final RepositorioSocial repositorio;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<List<Comentario>>> comentarios = new MutableLiveData<>();
    private final MutableLiveData<Boolean> enviando = new MutableLiveData<>(false);
    private String publicacaoId;

    public ViewModelComentarios(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.social(aplicacao);
    }

    public LiveData<EstadoConteudo<List<Comentario>>> getComentarios() {
        return comentarios;
    }

    public LiveData<Boolean> getEnviando() {
        return enviando;
    }

    public String getMeuId() {
        return gerenciadorSessao.obter() != null ? gerenciadorSessao.obter().getIdUsuario() : null;
    }

    public void iniciar(String id) {
        if (id.equals(publicacaoId)) {
            return;
        }
        publicacaoId = id;
        carregar();
    }

    public void carregar() {
        comentarios.setValue(EstadoConteudo.carregando());
        atualizar();
    }

    /** Busca de novo sem trocar a lista por "carregando": usado depois de comentar ou excluir. */
    private void atualizar() {
        repositorio.listarComentarios(gerenciadorSessao.obter(), publicacaoId,
                new RetornoRepositorio<List<Comentario>>() {
                    @Override
                    public void aoConcluir(List<Comentario> resultado) {
                        comentarios.setValue(EstadoConteudo.pronto(resultado));
                    }

                    @Override
                    public void aoFalhar(String mensagem) {
                        EstadoConteudo<List<Comentario>> atual = comentarios.getValue();
                        // Com uma lista já na tela, a falha de uma atualização não a apaga.
                        if (atual == null || atual.dados == null) {
                            comentarios.setValue(EstadoConteudo.comMensagem(mensagem));
                        }
                    }
                });
    }

    /** Quantos comentários e respostas existem na lista carregada; -1 se ainda não carregou. */
    public int total() {
        EstadoConteudo<List<Comentario>> atual = comentarios.getValue();
        if (atual == null || atual.dados == null) {
            return -1;
        }
        int total = 0;
        for (Comentario comentario : atual.dados) {
            total += 1 + comentario.respostas.size();
        }
        return total;
    }

    /**
     * @param paiId id do comentário respondido (sempre um comentário de primeiro nível), ou nulo.
     * @param aoConcluir chamado quando a API aceitou, para a tela limpar o campo.
     */
    public void enviar(String texto, String paiId, Runnable aoConcluir, Consumer<String> aoFalhar) {
        String limpo = texto == null ? "" : texto.trim();
        if (limpo.isEmpty() || Boolean.TRUE.equals(enviando.getValue())) {
            return;
        }
        enviando.setValue(true);
        repositorio.comentar(gerenciadorSessao.obter(), publicacaoId, limpo, paiId, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                enviando.setValue(false);
                aoConcluir.run();
                atualizar();
            }

            @Override
            public void aoFalhar(String mensagem) {
                enviando.setValue(false);
                aoFalhar.accept(mensagem);
            }
        });
    }

    public void excluir(Comentario comentario, Runnable aoConcluir, Consumer<String> aoFalhar) {
        repositorio.excluirComentario(gerenciadorSessao.obter(), comentario.id, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                aoConcluir.run();
                atualizar();
            }

            @Override
            public void aoFalhar(String mensagem) {
                aoFalhar.accept(mensagem);
            }
        });
    }
}
