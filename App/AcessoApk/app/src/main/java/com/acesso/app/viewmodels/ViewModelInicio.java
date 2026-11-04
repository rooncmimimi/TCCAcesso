package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Publicacao;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RepositorioSocial;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;
import java.util.function.Consumer;

/** Aba Início: feed da comunidade, como a página /feed do Site. */
public class ViewModelInicio extends AndroidViewModel {

    private final RepositorioConteudo repositorio;
    private final RepositorioSocial social;
    private final GerenciadorSessao gerenciadorSessao;
    private boolean desatualizado;
    private final MutableLiveData<EstadoConteudo<List<Publicacao>>> publicacoes = new MutableLiveData<>();

    public ViewModelInicio(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.conteudo(aplicacao);
        social = FabricaRepositorios.social(aplicacao);
    }

    public LiveData<EstadoConteudo<List<Publicacao>>> getPublicacoes() {
        return publicacoes;
    }

    /** Alguma publicação nova foi enviada: a próxima visita ao feed busca a lista de novo. */
    public void marcarDesatualizado() {
        desatualizado = true;
    }

    public void carregarSeNecessario() {
        if (publicacoes.getValue() == null || desatualizado) {
            carregar();
        }
    }

    /**
     * Curtir ou descurtir (a mesma rota alterna). A tela mostra o novo estado na hora; a resposta da API
     * corrige o total. Se falhar, volta ao que era e devolve a mensagem em {@code aoFalhar}.
     */
    public void curtir(Publicacao publicacao, Consumer<String> aoFalhar) {
        boolean antes = publicacao.curtidoPorMim;
        int totalAntes = publicacao.curtidas;
        publicacao.curtidoPorMim = !antes;
        publicacao.curtidas = Math.max(0, totalAntes + (antes ? -1 : 1));
        publicacoes.setValue(publicacoes.getValue());
        repositorio.curtir(gerenciadorSessao.obter(), publicacao.id, new RetornoRepositorio<Publicacao.Curtida>() {
            @Override
            public void aoConcluir(Publicacao.Curtida curtida) {
                publicacao.curtidoPorMim = curtida.curtido;
                publicacao.curtidas = curtida.total;
                publicacoes.setValue(publicacoes.getValue());
            }

            @Override
            public void aoFalhar(String mensagem) {
                publicacao.curtidoPorMim = antes;
                publicacao.curtidas = totalAntes;
                publicacoes.setValue(publicacoes.getValue());
                aoFalhar.accept(mensagem);
            }
        });
    }

    /** Troca o texto da própria publicação (PUT /postagens/:id) e mostra o novo texto na hora se a API aceitar. */
    public void editar(Publicacao publicacao, String conteudo, Runnable aoConcluir, Consumer<String> aoFalhar) {
        social.editarPublicacao(gerenciadorSessao.obter(), publicacao.id, conteudo, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                publicacao.conteudo = conteudo;
                publicacao.editada = true;
                publicacoes.setValue(publicacoes.getValue());
                aoConcluir.run();
            }

            @Override
            public void aoFalhar(String mensagem) {
                aoFalhar.accept(mensagem);
            }
        });
    }

    /** Exclui a própria publicação (DELETE /postagens/:id) e a tira da lista se a API aceitar. */
    public void excluir(Publicacao publicacao, Runnable aoConcluir, Consumer<String> aoFalhar) {
        social.excluirPublicacao(gerenciadorSessao.obter(), publicacao.id, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                EstadoConteudo<List<Publicacao>> atual = publicacoes.getValue();
                if (atual != null && atual.dados != null) {
                    List<Publicacao> restantes = new java.util.ArrayList<>(atual.dados);
                    restantes.remove(publicacao);
                    publicacoes.setValue(EstadoConteudo.pronto(restantes));
                }
                aoConcluir.run();
            }

            @Override
            public void aoFalhar(String mensagem) {
                aoFalhar.accept(mensagem);
            }
        });
    }

    /** A tela de comentários voltou com o total real: corrige a contagem do cartão. */
    public void definirTotalComentarios(String publicacaoId, int total) {
        EstadoConteudo<List<Publicacao>> atual = publicacoes.getValue();
        if (atual == null || atual.dados == null || total < 0) {
            return;
        }
        for (Publicacao publicacao : atual.dados) {
            if (publicacao.id != null && publicacao.id.equals(publicacaoId)) {
                publicacao.comentarios = total;
            }
        }
        publicacoes.setValue(atual);
    }

    public void carregar() {
        desatualizado = false;
        publicacoes.setValue(EstadoConteudo.carregando());
        repositorio.listarPublicacoes(gerenciadorSessao.obter(), new RetornoRepositorio<List<Publicacao>>() {
            @Override
            public void aoConcluir(List<Publicacao> resultado) {
                publicacoes.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                publicacoes.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
    }
}
