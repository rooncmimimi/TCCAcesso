package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RepositorioSocial;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;

/**
 * Aba Perfil: busca no servidor os dados da conta (GET /api/candidatos/me ou /api/empresas/me).
 * Enquanto carrega, ou se falhar, a tela segue mostrando o que já está na sessão.
 */
public class ViewModelPerfil extends AndroidViewModel {

    private final RepositorioConteudo repositorio;
    private final RepositorioSocial social;
    private final MutableLiveData<ResumoSeguidores> resumo = new MutableLiveData<>();
    private final GerenciadorSessao gerenciadorSessao;
    private final MutableLiveData<EstadoConteudo<PerfilConta>> perfil = new MutableLiveData<>();
    /** Conta a que o perfil carregado pertence: ao trocar de conta, não mostra o perfil da anterior. */
    private String idUsuarioCarregado;
    private boolean carregando;

    public ViewModelPerfil(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        repositorio = FabricaRepositorios.conteudo(aplicacao);
        social = FabricaRepositorios.social(aplicacao);
    }

    /** Seguidores e seguindo da própria conta; nulo enquanto não chegam (ou se falhar). */
    public LiveData<ResumoSeguidores> getResumo() {
        return resumo;
    }

    public LiveData<EstadoConteudo<PerfilConta>> getPerfil() {
        return perfil;
    }

    private void carregarResumo(SessaoUsuario sessao, PerfilConta propriedade) {
        propriedade.tipoConta = sessao.getTipoConta();
        if (propriedade.usuarioId == null) {
            propriedade.usuarioId = sessao.getIdUsuario();
        }
        social.carregarResumoSeguidores(sessao, propriedade, new RetornoRepositorio<ResumoSeguidores>() {
            @Override
            public void aoConcluir(ResumoSeguidores resultado) {
                resumo.setValue(resultado);
            }

            @Override
            public void aoFalhar(String mensagem) {
                // Os contadores são um extra: sem eles o perfil segue completo.
            }
        });
    }

    /** Busca de novo a cada visita à aba, sem apagar o que já está na tela enquanto isso. */
    public void carregar() {
        SessaoUsuario sessao = gerenciadorSessao.obter();
        if (sessao == null || carregando) {
            return;
        }
        String idUsuario = sessao.getIdUsuario();
        if (idUsuarioCarregado != null && !idUsuarioCarregado.equals(idUsuario)) {
            perfil.setValue(null);
        }
        idUsuarioCarregado = idUsuario;
        carregando = true;
        repositorio.carregarPerfil(sessao, new RetornoRepositorio<PerfilConta>() {
            @Override
            public void aoConcluir(PerfilConta resultado) {
                carregando = false;
                perfil.setValue(EstadoConteudo.pronto(resultado));
                carregarResumo(sessao, resultado);
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando = false;
                EstadoConteudo<PerfilConta> atual = perfil.getValue();
                // Falhou, mas já havia um perfil carregado: mantém na tela, sem mensagem.
                if (atual == null || atual.dados == null) {
                    perfil.setValue(EstadoConteudo.comMensagem(mensagem));
                }
            }
        });
    }
}
