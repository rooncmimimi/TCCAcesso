package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Conversa;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioMensagens;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;

/** Lista de conversas (página /mensagens do site, coluna da esquerda). */
public class ViewModelConversas extends AndroidViewModel {

    private final RepositorioMensagens repositorio;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<List<Conversa>>> conversas = new MutableLiveData<>();

    public ViewModelConversas(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.mensagens(aplicacao);
    }

    public LiveData<EstadoConteudo<List<Conversa>>> getConversas() {
        return conversas;
    }

    /** Mostra o indicador só na primeira carga; ao voltar de uma conversa, atualiza sem piscar a lista. */
    public void carregar() {
        EstadoConteudo<List<Conversa>> atual = conversas.getValue();
        if (atual == null || atual.dados == null) {
            conversas.setValue(EstadoConteudo.carregando());
        }
        repositorio.listarConversas(gerenciadorSessao.obter(), new RetornoRepositorio<List<Conversa>>() {
            @Override
            public void aoConcluir(List<Conversa> resultado) {
                conversas.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                EstadoConteudo<List<Conversa>> anterior = conversas.getValue();
                if (anterior == null || anterior.dados == null) {
                    conversas.setValue(EstadoConteudo.comMensagem(mensagem));
                }
            }
        });
    }
}
