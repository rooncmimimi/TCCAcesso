package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.Mensagem;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioMensagens;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.ArrayList;
import java.util.List;

/**
 * Uma conversa aberta: cabeçalho (com quem), mensagens e envio. A tela chama {@link #atualizar()} a
 * cada poucos segundos enquanto está visível; a atualização é silenciosa (não apaga a lista) e marca
 * como lidas as mensagens novas da outra pessoa.
 */
public class ViewModelConversa extends AndroidViewModel {

    private final RepositorioMensagens repositorio;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<Conversa>> conversa = new MutableLiveData<>();
    private final MutableLiveData<EstadoConteudo<List<Mensagem>>> mensagens = new MutableLiveData<>();
    private final MutableLiveData<Boolean> enviando = new MutableLiveData<>(false);
    /** Erro do último envio (o texto continua no campo para tentar de novo). Nulo = sem erro. */
    private final MutableLiveData<String> erroEnvio = new MutableLiveData<>();
    private String conversaId;
    private boolean atualizando;

    public ViewModelConversa(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.mensagens(aplicacao);
    }

    public LiveData<EstadoConteudo<Conversa>> getConversa() {
        return conversa;
    }

    public LiveData<EstadoConteudo<List<Mensagem>>> getMensagens() {
        return mensagens;
    }

    public LiveData<Boolean> getEnviando() {
        return enviando;
    }

    public LiveData<String> getErroEnvio() {
        return erroEnvio;
    }

    /** Id da conta logada: decide quais balões são "meus". */
    public String getMeuId() {
        SessaoUsuario sessao = gerenciadorSessao.obter();
        return sessao != null ? sessao.getIdUsuario() : null;
    }

    public void iniciar(String id) {
        if (id.equals(conversaId) && mensagens.getValue() != null && mensagens.getValue().dados != null) {
            return;
        }
        conversaId = id;
        SessaoUsuario sessao = gerenciadorSessao.obter();
        conversa.setValue(EstadoConteudo.carregando());
        repositorio.carregarConversa(sessao, id, new RetornoRepositorio<Conversa>() {
            @Override
            public void aoConcluir(Conversa resultado) {
                conversa.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                conversa.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
        mensagens.setValue(EstadoConteudo.carregando());
        buscarMensagens(true);
    }

    /** Chamado periodicamente pela tela: busca mensagens novas sem mostrar carregamento. */
    public void atualizar() {
        if (conversaId == null || atualizando || Boolean.TRUE.equals(enviando.getValue())) {
            return;
        }
        buscarMensagens(false);
    }

    public void tentarDeNovo() {
        String id = conversaId;
        conversaId = null;
        if (id != null) {
            iniciar(id);
        }
    }

    private void buscarMensagens(boolean primeiraCarga) {
        atualizando = true;
        repositorio.listarMensagens(gerenciadorSessao.obter(), conversaId, new RetornoRepositorio<List<Mensagem>>() {
            @Override
            public void aoConcluir(List<Mensagem> resultado) {
                atualizando = false;
                if (primeiraCarga || mudou(resultado)) {
                    mensagens.setValue(EstadoConteudo.pronto(resultado));
                }
                marcarLidasSePreciso(resultado);
            }

            @Override
            public void aoFalhar(String mensagem) {
                atualizando = false;
                // Na atualização periódica, uma falha passageira não apaga a conversa da tela.
                if (primeiraCarga) {
                    mensagens.setValue(EstadoConteudo.comMensagem(mensagem));
                }
            }
        });
    }

    /** Evita redesenhar a lista (e perder a posição de leitura) quando nada mudou. */
    private boolean mudou(List<Mensagem> novas) {
        EstadoConteudo<List<Mensagem>> atual = mensagens.getValue();
        if (atual == null || atual.dados == null || atual.dados.size() != novas.size()) {
            return true;
        }
        for (int i = 0; i < novas.size(); i++) {
            Mensagem antiga = atual.dados.get(i);
            Mensagem nova = novas.get(i);
            if (!String.valueOf(antiga.id).equals(nova.id) || antiga.lida != nova.lida) {
                return true;
            }
        }
        return false;
    }

    private void marcarLidasSePreciso(List<Mensagem> lista) {
        String meuId = getMeuId();
        boolean temNaoLida = false;
        for (Mensagem mensagem : lista) {
            if (!mensagem.lida && (mensagem.remetenteId == null || !mensagem.remetenteId.equalsIgnoreCase(meuId))) {
                temNaoLida = true;
                break;
            }
        }
        if (!temNaoLida) {
            return;
        }
        repositorio.marcarComoLidas(gerenciadorSessao.obter(), conversaId, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
            }

            @Override
            public void aoFalhar(String mensagem) {
                // Tenta de novo na próxima atualização.
            }
        });
    }

    /** Envia o texto; em caso de sucesso a mensagem entra no fim da lista e {@code aoEnviar} limpa o campo. */
    public void enviar(String texto, Runnable aoEnviar) {
        String conteudo = texto == null ? "" : texto.trim();
        if (conversaId == null || conteudo.isEmpty() || Boolean.TRUE.equals(enviando.getValue())) {
            return;
        }
        enviando.setValue(true);
        erroEnvio.setValue(null);
        repositorio.enviar(gerenciadorSessao.obter(), conversaId, conteudo, new RetornoRepositorio<Mensagem>() {
            @Override
            public void aoConcluir(Mensagem enviada) {
                enviando.setValue(false);
                EstadoConteudo<List<Mensagem>> atual = mensagens.getValue();
                List<Mensagem> lista = atual != null && atual.dados != null
                        ? new ArrayList<>(atual.dados) : new ArrayList<>();
                lista.add(enviada);
                mensagens.setValue(EstadoConteudo.pronto(lista));
                aoEnviar.run();
            }

            @Override
            public void aoFalhar(String mensagem) {
                enviando.setValue(false);
                erroEnvio.setValue(mensagem);
            }
        });
    }
}
