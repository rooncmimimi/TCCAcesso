package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.PermissaoConversa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RepositorioMensagens;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

/**
 * Perfil de outra pessoa ou empresa (página /perfil/:usuarioId do site) e o botão "Mensagem":
 * consulta antes se a conversa pode ser iniciada e, ao tocar, abre (ou recupera) a conversa pela API.
 */
public class ViewModelPerfilUsuario extends AndroidViewModel {

    private final RepositorioConteudo conteudo;
    private final RepositorioMensagens mensagens;
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<PerfilConta>> perfil = new MutableLiveData<>();
    private final MutableLiveData<PermissaoConversa> permissao = new MutableLiveData<>();
    /** Conversa aberta pelo botão "Mensagem" (a tela navega e limpa). Mensagem = erro ao abrir. */
    private final MutableLiveData<EstadoConteudo<Conversa>> conversaAberta = new MutableLiveData<>();
    private String usuarioId;

    public ViewModelPerfilUsuario(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        conteudo = FabricaRepositorios.conteudo(aplicacao);
        mensagens = FabricaRepositorios.mensagens(aplicacao);
    }

    public LiveData<EstadoConteudo<PerfilConta>> getPerfil() {
        return perfil;
    }

    public LiveData<PermissaoConversa> getPermissao() {
        return permissao;
    }

    public LiveData<EstadoConteudo<Conversa>> getConversaAberta() {
        return conversaAberta;
    }

    public void carregar(String id) {
        if (id.equals(usuarioId) && perfil.getValue() != null && perfil.getValue().dados != null) {
            return;
        }
        usuarioId = id;
        SessaoUsuario sessao = gerenciadorSessao.obter();
        perfil.setValue(EstadoConteudo.carregando());
        conteudo.carregarPerfilDeUsuario(sessao, id, new RetornoRepositorio<PerfilConta>() {
            @Override
            public void aoConcluir(PerfilConta resultado) {
                perfil.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                perfil.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
        if (sessao != null && !id.equals(sessao.getIdUsuario())) {
            mensagens.podeIniciar(sessao, id, new RetornoRepositorio<PermissaoConversa>() {
                @Override
                public void aoConcluir(PermissaoConversa resultado) {
                    permissao.setValue(resultado);
                }

                @Override
                public void aoFalhar(String mensagem) {
                    // Sem a consulta, o botão continua ativo e a API decide ao abrir a conversa.
                    PermissaoConversa desconhecida = new PermissaoConversa();
                    desconhecida.permitido = true;
                    permissao.setValue(desconhecida);
                }
            });
        }
    }

    public void recarregar() {
        String id = usuarioId;
        usuarioId = null;
        if (id != null) {
            carregar(id);
        }
    }

    public void abrirConversa() {
        if (usuarioId == null) {
            return;
        }
        conversaAberta.setValue(EstadoConteudo.carregando());
        mensagens.abrirConversa(gerenciadorSessao.obter(), usuarioId, new RetornoRepositorio<Conversa>() {
            @Override
            public void aoConcluir(Conversa resultado) {
                conversaAberta.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                conversaAberta.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
    }

    /** A tela já tratou o resultado (abriu a conversa ou mostrou o erro). */
    public void conversaTratada() {
        conversaAberta.setValue(null);
    }
}
