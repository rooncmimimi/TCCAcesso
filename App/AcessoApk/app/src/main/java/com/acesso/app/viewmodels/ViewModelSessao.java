package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RenovadorSessao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

/**
 * Cuida da sessão nas telas da área logada (TelaPrincipal e TelaStatusEmpresa):
 * renova o token vencido sempre que a tela volta a aparecer, atualiza a situação da empresa
 * e encerra a sessão ao sair ou quando o servidor a recusa de vez.
 *
 * Quem renova é o {@link RenovadorSessao} (uma renovação por vez no app inteiro). Ele também
 * avisa este ViewModel quando uma requisição feita em outro lugar descobre que a sessão acabou.
 */
public class ViewModelSessao extends AndroidViewModel {

    private final RepositorioAutenticacao repositorioAutenticacao;
    private final GerenciadorSessao gerenciadorSessao;
    private final RenovadorSessao renovador;

    private final MutableLiveData<SessaoUsuario> sessao = new MutableLiveData<>();
    /** Recebe um valor quando a sessão acaba; o texto é o aviso para a apresentação (pode ser vazio). */
    private final MutableLiveData<String> sessaoEncerrada = new MutableLiveData<>();
    private final RenovadorSessao.Ouvinte aoEncerrarSessao = sessaoEncerrada::setValue;
    private boolean renovando;
    private boolean consultandoEmpresa;

    public ViewModelSessao(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = FabricaRepositorios.autenticacao(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        renovador = RenovadorSessao.global(aplicacao);
        renovador.adicionarOuvinte(aoEncerrarSessao);
        sessao.setValue(gerenciadorSessao.obter());
    }

    @Override
    protected void onCleared() {
        renovador.removerOuvinte(aoEncerrarSessao);
    }

    public LiveData<SessaoUsuario> getSessao() {
        return sessao;
    }

    public LiveData<String> getSessaoEncerrada() {
        return sessaoEncerrada;
    }

    /**
     * Chamado sempre que a tela aparece. Sem sessão, volta para a apresentação; com o token
     * vencido, renova. Se o servidor disser que a sessão acabou (recusada, conta bloqueada,
     * senha alterada), o RenovadorSessao apaga a sessão e a tela recebe o aviso por
     * {@link #getSessaoEncerrada()}. Falha passageira (sem internet, 429, 5xx) mantém a pessoa
     * logada e a próxima chamada tenta de novo.
     */
    public void verificar() {
        SessaoUsuario atual = gerenciadorSessao.obter();
        if (atual == null) {
            sessaoEncerrada.setValue("");
            return;
        }
        if (!atual.estaExpirada(System.currentTimeMillis())) {
            atualizarSituacaoDaEmpresa(atual);
            return;
        }
        if (renovando) {
            return;
        }
        renovando = true;
        renovador.renovar(atual, new RetornoRepositorio<SessaoUsuario>() {
            @Override
            public void aoConcluir(SessaoUsuario renovada) {
                renovando = false;
                sessao.setValue(renovada);
                atualizarSituacaoDaEmpresa(renovada);
            }

            @Override
            public void aoFalhar(String mensagem) {
                // Passageira ou definitiva: a definitiva já foi apagada e avisada pelo RenovadorSessao.
                renovando = false;
            }
        });
    }

    /** POST /auth/refresh não traz a empresa: consulta a situação atual (ex.: aprovada depois do login). */
    private void atualizarSituacaoDaEmpresa(SessaoUsuario atual) {
        if (!atual.ehEmpresa() || consultandoEmpresa) {
            return;
        }
        consultandoEmpresa = true;
        repositorioAutenticacao.carregarStatusEmpresa(atual, new RetornoRepositorio<String>() {
            @Override
            public void aoConcluir(String status) {
                consultandoEmpresa = false;
                SessaoUsuario salva = gerenciadorSessao.obter();
                if (status == null || salva == null || status.equals(salva.getStatusEmpresa())) {
                    return;
                }
                gerenciadorSessao.atualizarStatusEmpresa(status);
                sessao.setValue(gerenciadorSessao.obter());
            }

            @Override
            public void aoFalhar(String mensagem) {
                // Mantém o último status conhecido; se a sessão acabou, o RenovadorSessao já avisou.
                consultandoEmpresa = false;
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
