package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Publicacao;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;

/** Aba Início: feed da comunidade, como a página /feed do Site. */
public class ViewModelInicio extends AndroidViewModel {

    private final RepositorioConteudo repositorio;
    private final GerenciadorSessao gerenciadorSessao;
    private boolean desatualizado;
    private final MutableLiveData<EstadoConteudo<List<Publicacao>>> publicacoes = new MutableLiveData<>();

    public ViewModelInicio(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.conteudo(aplicacao);
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
