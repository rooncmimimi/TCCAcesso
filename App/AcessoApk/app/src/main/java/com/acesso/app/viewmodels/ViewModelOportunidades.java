package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;

/**
 * Aba Oportunidades. Pessoa: busca de vagas com filtros (página /vagas do Site).
 * Empresa: painel com números e "minhas vagas" (página /dashboard/empresa do Site).
 */
public class ViewModelOportunidades extends AndroidViewModel {

    private final RepositorioConteudo repositorio = FabricaRepositorios.conteudo();
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<List<Vaga>>> vagas = new MutableLiveData<>();
    private final MutableLiveData<EstadoConteudo<ResumoEmpresa>> resumoEmpresa = new MutableLiveData<>();

    /** Filtros aplicados; null = todos. Valores iguais aos da API (ex.: remoto, pcd). */
    private String busca = "";
    private String modalidade;
    private String publicoAlvo;

    public ViewModelOportunidades(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
    }

    public LiveData<EstadoConteudo<List<Vaga>>> getVagas() {
        return vagas;
    }

    public LiveData<EstadoConteudo<ResumoEmpresa>> getResumoEmpresa() {
        return resumoEmpresa;
    }

    public String getModalidade() {
        return modalidade;
    }

    public String getPublicoAlvo() {
        return publicoAlvo;
    }

    public void carregarVagasSeNecessario() {
        if (vagas.getValue() == null) {
            buscarVagas(busca, modalidade, publicoAlvo);
        }
    }

    public void buscarVagas(String novaBusca, String novaModalidade, String novoPublicoAlvo) {
        busca = novaBusca != null ? novaBusca.trim() : "";
        modalidade = novaModalidade;
        publicoAlvo = novoPublicoAlvo;
        vagas.setValue(EstadoConteudo.carregando());
        repositorio.listarVagas(gerenciadorSessao.obter(), busca, modalidade, publicoAlvo,
                new RetornoRepositorio<List<Vaga>>() {
                    @Override
                    public void aoConcluir(List<Vaga> resultado) {
                        vagas.setValue(EstadoConteudo.pronto(resultado));
                    }

                    @Override
                    public void aoFalhar(String mensagem) {
                        vagas.setValue(EstadoConteudo.comMensagem(mensagem));
                    }
                });
    }

    public void carregarResumoEmpresa(boolean forcar) {
        if (!forcar && resumoEmpresa.getValue() != null) {
            return;
        }
        resumoEmpresa.setValue(EstadoConteudo.carregando());
        repositorio.carregarResumoEmpresa(gerenciadorSessao.obter(), new RetornoRepositorio<ResumoEmpresa>() {
            @Override
            public void aoConcluir(ResumoEmpresa resultado) {
                resumoEmpresa.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                resumoEmpresa.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
    }
}
