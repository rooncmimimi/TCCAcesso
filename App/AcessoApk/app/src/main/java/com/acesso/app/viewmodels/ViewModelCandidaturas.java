package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Candidatura;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;

/** Candidaturas da pessoa logada e a situação de cada uma (painel do candidato no site). */
public class ViewModelCandidaturas extends AndroidViewModel {

    private final RepositorioConteudo repositorio;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<List<Candidatura>>> candidaturas = new MutableLiveData<>();

    public ViewModelCandidaturas(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.conteudo(aplicacao);
    }

    public LiveData<EstadoConteudo<List<Candidatura>>> getCandidaturas() {
        return candidaturas;
    }

    public void carregar() {
        candidaturas.setValue(EstadoConteudo.carregando());
        repositorio.listarCandidaturas(gerenciadorSessao.obter(), new RetornoRepositorio<List<Candidatura>>() {
            @Override
            public void aoConcluir(List<Candidatura> resultado) {
                candidaturas.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                candidaturas.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
    }
}
