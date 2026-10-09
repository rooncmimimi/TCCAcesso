package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.servicos.MensagensErro;
import com.acesso.app.utilitarios.GerenciadorSessao;

/**
 * Cuida da sessão nas telas da área logada (TelaPrincipal e TelaStatusEmpresa):
 * renova o token vencido ao abrir o app e encerra a sessão ao sair.
 */
public class ViewModelSessao extends AndroidViewModel {

    private final RepositorioAutenticacao repositorioAutenticacao;
    private final GerenciadorSessao gerenciadorSessao;

    private final MutableLiveData<SessaoUsuario> sessao = new MutableLiveData<>();
    /** Recebe um valor quando a sessão acaba; o texto é o aviso para a apresentação (pode ser vazio). */
    private final MutableLiveData<String> sessaoEncerrada = new MutableLiveData<>();
    private boolean verificada;

    public ViewModelSessao(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = FabricaRepositorios.autenticacao(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        sessao.setValue(gerenciadorSessao.obter());
    }

    public LiveData<SessaoUsuario> getSessao() {
        return sessao;
    }

    public LiveData<String> getSessaoEncerrada() {
        return sessaoEncerrada;
    }

    /**
     * Ao abrir a área logada: sem sessão, volta para a apresentação; com o token vencido,
     * renova. Se o servidor disser que a sessão acabou, encerra; se for só falta de
     * internet, mantém a pessoa logada (ela não precisa entrar de novo por estar offline).
     */
    public void verificar() {
        if (verificada) {
            return;
        }
        verificada = true;
        SessaoUsuario atual = gerenciadorSessao.obter();
        if (atual == null) {
            sessaoEncerrada.setValue("");
            return;
        }
        if (!atual.estaExpirada(System.currentTimeMillis())) {
            return;
        }
        repositorioAutenticacao.renovarSessao(atual, new RetornoRepositorio<SessaoUsuario>() {
            @Override
            public void aoConcluir(SessaoUsuario renovada) {
                gerenciadorSessao.salvar(renovada);
                sessao.setValue(renovada);
            }

            @Override
            public void aoFalhar(String mensagem) {
                if (MensagensErro.SESSAO_EXPIRADA.equals(mensagem)) {
                    gerenciadorSessao.limpar();
                    sessaoEncerrada.setValue(MensagensErro.SESSAO_EXPIRADA);
                }
            }
        });
    }

    public void sair() {
        SessaoUsuario atual = gerenciadorSessao.obter();
        if (atual != null) {
            repositorioAutenticacao.sair(atual);
        }
        gerenciadorSessao.limpar();
        sessaoEncerrada.setValue("");
    }
}
