package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioMensagens;
import com.acesso.app.repositorios.RepositorioNotificacoes;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

/**
 * Selos de não lidas da área logada: mensagens (ícone do cabeçalho) e notificações (aba). Atualizados
 * sempre que a TelaPrincipal volta a aparecer e depois de ler uma conversa ou notificação. Uma falha
 * (sem internet, por exemplo) mantém o último número conhecido.
 */
public class ViewModelContadores extends AndroidViewModel {

    private final RepositorioMensagens mensagens;
    private final RepositorioNotificacoes notificacoes;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<Integer> mensagensNaoLidas = new MutableLiveData<>(0);
    private final MutableLiveData<Integer> notificacoesNaoLidas = new MutableLiveData<>(0);

    public ViewModelContadores(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        mensagens = FabricaRepositorios.mensagens(aplicacao);
        notificacoes = FabricaRepositorios.notificacoes(aplicacao);
    }

    public LiveData<Integer> getMensagensNaoLidas() {
        return mensagensNaoLidas;
    }

    public LiveData<Integer> getNotificacoesNaoLidas() {
        return notificacoesNaoLidas;
    }

    public void atualizar() {
        SessaoUsuario sessao = gerenciadorSessao.obter();
        if (sessao == null) {
            return;
        }
        mensagens.contarNaoLidas(sessao, new Contagem(mensagensNaoLidas));
        notificacoes.contarNaoLidas(sessao, new Contagem(notificacoesNaoLidas));
    }

    private static final class Contagem implements RetornoRepositorio<Integer> {
        private final MutableLiveData<Integer> destino;

        Contagem(MutableLiveData<Integer> destino) {
            this.destino = destino;
        }

        @Override
        public void aoConcluir(Integer total) {
            destino.setValue(total != null ? total : 0);
        }

        @Override
        public void aoFalhar(String mensagem) {
            // Mantém o último número conhecido.
        }
    }
}
