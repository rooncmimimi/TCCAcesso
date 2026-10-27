package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Notificacao;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioNotificacoes;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.List;

/** Aba Notificações: a lista do sino do site, com "marcar como lida" e "marcar todas". */
public class ViewModelNotificacoes extends AndroidViewModel {

    private final RepositorioNotificacoes repositorio;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<List<Notificacao>>> notificacoes = new MutableLiveData<>();
    /** Erro de uma ação (marcar como lida); a lista continua na tela. */
    private final MutableLiveData<String> erroAcao = new MutableLiveData<>();

    public ViewModelNotificacoes(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.notificacoes(aplicacao);
    }

    public LiveData<EstadoConteudo<List<Notificacao>>> getNotificacoes() {
        return notificacoes;
    }

    public LiveData<String> getErroAcao() {
        return erroAcao;
    }

    /** A tela já mostrou o erro: não repete ao voltar para a aba. */
    public void limparErroAcao() {
        erroAcao.setValue(null);
    }

    /** Mostra o indicador só na primeira carga; depois atualiza sem apagar a lista da tela. */
    public void carregar() {
        EstadoConteudo<List<Notificacao>> atual = notificacoes.getValue();
        if (atual == null || atual.dados == null) {
            notificacoes.setValue(EstadoConteudo.carregando());
        }
        repositorio.listar(gerenciadorSessao.obter(), new RetornoRepositorio<List<Notificacao>>() {
            @Override
            public void aoConcluir(List<Notificacao> resultado) {
                notificacoes.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                EstadoConteudo<List<Notificacao>> anterior = notificacoes.getValue();
                if (anterior == null || anterior.dados == null) {
                    notificacoes.setValue(EstadoConteudo.comMensagem(mensagem));
                } else {
                    erroAcao.setValue(mensagem);
                }
            }
        });
    }

    /** Marca na tela na hora e confirma no servidor; se falhar, recarrega para mostrar o estado real. */
    public void marcarComoLida(Notificacao notificacao, Runnable depois) {
        if (notificacao.lida) {
            depois.run();
            return;
        }
        notificacao.lida = true;
        notificacoes.setValue(notificacoes.getValue());
        repositorio.marcarComoLida(gerenciadorSessao.obter(), notificacao.id, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                depois.run();
            }

            @Override
            public void aoFalhar(String mensagem) {
                notificacao.lida = false;
                notificacoes.setValue(notificacoes.getValue());
                erroAcao.setValue(mensagem);
            }
        });
    }

    public void marcarTodasComoLidas(Runnable depois) {
        repositorio.marcarTodasComoLidas(gerenciadorSessao.obter(), new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                EstadoConteudo<List<Notificacao>> atual = notificacoes.getValue();
                if (atual != null && atual.dados != null) {
                    for (Notificacao notificacao : atual.dados) {
                        notificacao.lida = true;
                    }
                    notificacoes.setValue(atual);
                }
                depois.run();
            }

            @Override
            public void aoFalhar(String mensagem) {
                erroAcao.setValue(mensagem);
            }
        });
    }
}
