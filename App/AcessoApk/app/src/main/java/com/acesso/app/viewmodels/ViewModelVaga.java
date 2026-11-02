package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Candidatura;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;

/** Detalhe da vaga (página /vaga/:id do site) e a candidatura da pessoa logada. */
public class ViewModelVaga extends AndroidViewModel {

    /** Situação do botão "Candidatar-se". */
    public enum SituacaoCandidatura { DISPONIVEL, ENVIANDO, ENVIADA }

    private final RepositorioConteudo repositorio;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<Vaga>> vaga = new MutableLiveData<>();
    private final MutableLiveData<SituacaoCandidatura> candidatura = new MutableLiveData<>(SituacaoCandidatura.DISPONIVEL);
    /** Resultado da candidatura para a mensagem de status: sucesso ou o erro da API. */
    private final MutableLiveData<EstadoConteudo<String>> resultadoCandidatura = new MutableLiveData<>();
    private String vagaId;

    public ViewModelVaga(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.conteudo(aplicacao);
    }

    public LiveData<EstadoConteudo<Vaga>> getVaga() {
        return vaga;
    }

    public LiveData<SituacaoCandidatura> getCandidatura() {
        return candidatura;
    }

    public LiveData<EstadoConteudo<String>> getResultadoCandidatura() {
        return resultadoCandidatura;
    }

    public void carregar(String id) {
        if (id.equals(vagaId) && vaga.getValue() != null && vaga.getValue().dados != null) {
            return;
        }
        vagaId = id;
        vaga.setValue(EstadoConteudo.carregando());
        repositorio.obterVaga(gerenciadorSessao.obter(), id, new RetornoRepositorio<Vaga>() {
            @Override
            public void aoConcluir(Vaga resultado) {
                vaga.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                vaga.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
        conferirCandidaturaExistente(id);
    }

    /**
     * Pessoa que já se candidatou vê "Candidatura enviada" em vez do botão (a API recusaria a repetida
     * com 409). Se a consulta falhar, o botão fica disponível e a própria API avisa no envio.
     */
    private void conferirCandidaturaExistente(String id) {
        SessaoUsuario sessao = gerenciadorSessao.obter();
        if (sessao == null || sessao.ehEmpresa()) {
            return;
        }
        repositorio.listarCandidaturas(sessao, new RetornoRepositorio<List<Candidatura>>() {
            @Override
            public void aoConcluir(List<Candidatura> candidaturas) {
                for (Candidatura existente : candidaturas) {
                    if (id.equals(existente.vagaId) && !"cancelada".equals(existente.status)) {
                        candidatura.setValue(SituacaoCandidatura.ENVIADA);
                        return;
                    }
                }
            }

            @Override
            public void aoFalhar(String mensagem) {
                // O botão continua disponível.
            }
        });
    }

    public void recarregar() {
        String id = vagaId;
        vagaId = null;
        if (id != null) {
            carregar(id);
        }
    }

    /** {@code mensagem} é opcional (apresentação para a empresa, até 2000 caracteres). */
    public void candidatar(String mensagem, String textoSucesso) {
        if (vagaId == null || candidatura.getValue() != SituacaoCandidatura.DISPONIVEL) {
            return;
        }
        candidatura.setValue(SituacaoCandidatura.ENVIANDO);
        resultadoCandidatura.setValue(null);
        repositorio.candidatar(gerenciadorSessao.obter(), vagaId, mensagem, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                candidatura.setValue(SituacaoCandidatura.ENVIADA);
                resultadoCandidatura.setValue(EstadoConteudo.pronto(textoSucesso));
            }

            @Override
            public void aoFalhar(String mensagem) {
                candidatura.setValue(SituacaoCandidatura.DISPONIVEL);
                resultadoCandidatura.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
    }
}
