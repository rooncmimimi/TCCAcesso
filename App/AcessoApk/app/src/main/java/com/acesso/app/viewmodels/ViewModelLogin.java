package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Validador;

public class ViewModelLogin extends AndroidViewModel {

    private final RepositorioAutenticacao repositorioAutenticacao;
    private final GerenciadorSessao gerenciadorSessao;

    private final MutableLiveData<String> erroEmail = new MutableLiveData<>();
    private final MutableLiveData<String> erroSenha = new MutableLiveData<>();
    private final MutableLiveData<String> mensagemErro = new MutableLiveData<>();
    private final MutableLiveData<Boolean> carregando = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> logado = new MutableLiveData<>(false);

    public ViewModelLogin(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = new RepositorioAutenticacao(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
    }

    public LiveData<String> getErroEmail() {
        return erroEmail;
    }

    public LiveData<String> getErroSenha() {
        return erroSenha;
    }

    public LiveData<String> getMensagemErro() {
        return mensagemErro;
    }

    public LiveData<Boolean> estaCarregando() {
        return carregando;
    }

    public LiveData<Boolean> estaLogado() {
        return logado;
    }

    /** Ao abrir o app: se já existe sessão salva, entra direto (renovando o token se preciso). */
    public void verificarSessaoSalva() {
        SessaoUsuario sessaoSalva = gerenciadorSessao.obter();
        if (sessaoSalva == null) {
            return;
        }
        if (!sessaoSalva.estaExpirada(System.currentTimeMillis())) {
            logado.setValue(true);
            return;
        }
        carregando.setValue(true);
        repositorioAutenticacao.renovarSessao(sessaoSalva.getTokenRenovacao(), new RetornoRepositorio<SessaoUsuario>() {
            @Override
            public void aoConcluir(SessaoUsuario sessao) {
                gerenciadorSessao.salvar(sessao);
                carregando.setValue(false);
                logado.setValue(true);
            }

            @Override
            public void aoFalhar(String mensagem) {
                gerenciadorSessao.limpar();
                carregando.setValue(false);
            }
        });
    }

    public void entrar(String email, String senha) {
        if (Boolean.TRUE.equals(carregando.getValue())) {
            return;
        }
        mensagemErro.setValue(null);

        String problemaEmail = Validador.validarEmail(email);
        String problemaSenha = Validador.validarSenhaLogin(senha);
        erroEmail.setValue(problemaEmail);
        erroSenha.setValue(problemaSenha);
        if (problemaEmail != null || problemaSenha != null) {
            return;
        }

        carregando.setValue(true);
        repositorioAutenticacao.entrar(email, senha, new RetornoRepositorio<SessaoUsuario>() {
            @Override
            public void aoConcluir(SessaoUsuario sessao) {
                gerenciadorSessao.salvar(sessao);
                carregando.setValue(false);
                logado.setValue(true);
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando.setValue(false);
                mensagemErro.setValue(mensagem);
            }
        });
    }
}
