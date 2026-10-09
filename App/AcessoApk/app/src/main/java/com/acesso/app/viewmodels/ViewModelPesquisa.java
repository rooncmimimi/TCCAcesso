package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;

/** Aba Pesquisa: pessoas, empresas e vagas (página /descobrir e GET /api/busca do Site). */
public class ViewModelPesquisa extends AndroidViewModel {

    public static final int TAMANHO_MINIMO_TERMO = 2;

    private final RepositorioConteudo repositorio = FabricaRepositorios.conteudo();
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<List<ItemBusca>>> resultados = new MutableLiveData<>();
    private final MutableLiveData<String> erroTermo = new MutableLiveData<>();

    public ViewModelPesquisa(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
    }

    public LiveData<EstadoConteudo<List<ItemBusca>>> getResultados() {
        return resultados;
    }

    public LiveData<String> getErroTermo() {
        return erroTermo;
    }

    public void pesquisar(String termo, ItemBusca.Categoria categoria) {
        String termoLimpo = termo != null ? termo.trim() : "";
        if (termoLimpo.length() < TAMANHO_MINIMO_TERMO) {
            erroTermo.setValue("Digite pelo menos " + TAMANHO_MINIMO_TERMO + " letras para pesquisar.");
            return;
        }
        erroTermo.setValue(null);
        resultados.setValue(EstadoConteudo.carregando());
        repositorio.buscar(gerenciadorSessao.obter(), termoLimpo, categoria, new RetornoRepositorio<List<ItemBusca>>() {
            @Override
            public void aoConcluir(List<ItemBusca> resultado) {
                resultados.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                resultados.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
    }
}
