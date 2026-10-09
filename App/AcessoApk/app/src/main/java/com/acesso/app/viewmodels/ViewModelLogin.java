package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.ResultadoLogin;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Validador;

/**
 * Login: valida os campos, chama o repositório e só considera a pessoa autenticada
 * quando o servidor devolve uma sessão. Campos preenchidos não bastam.
 */
public class ViewModelLogin extends AndroidViewModel {

    static final String EMAIL_NAO_CONFIRMADO =
            "Confirme seu e-mail antes de entrar. Procure a mensagem do ACESSO na sua caixa de entrada e no spam.";

    private final RepositorioAutenticacao repositorioAutenticacao;
    private final GerenciadorSessao gerenciadorSessao;

    private final MutableLiveData<String> erroEmail = new MutableLiveData<>();
    private final MutableLiveData<String> erroSenha = new MutableLiveData<>();
    private final MutableLiveData<String> mensagemErro = new MutableLiveData<>();
    private final MutableLiveData<Boolean> carregando = new MutableLiveData<>(false);
    private final MutableLiveData<SessaoUsuario> sessaoAutenticada = new MutableLiveData<>();
    private final MutableLiveData<Boolean> perguntarReativacao = new MutableLiveData<>(false);

    /** Guardados só em memória, enquanto a pergunta "reativar a conta?" está na tela. */
    private String emailPendente;
    private String senhaPendente;

    public ViewModelLogin(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = FabricaRepositorios.autenticacao(aplicacao);
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

    /** Recebe a sessão quando o login dá certo; a tela leva para a área do tipo de conta. */
    public LiveData<SessaoUsuario> getSessaoAutenticada() {
        return sessaoAutenticada;
    }

    public LiveData<Boolean> devePerguntarReativacao() {
        return perguntarReativacao;
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
        enviar(email.trim(), senha, false);
    }

    /** A pessoa aceitou reativar a conta pausada: repete o login avisando o servidor. */
    public void reativarConta() {
        perguntarReativacao.setValue(false);
        if (emailPendente != null && senhaPendente != null) {
            enviar(emailPendente, senhaPendente, true);
        }
    }

    public void cancelarReativacao() {
        perguntarReativacao.setValue(false);
        emailPendente = null;
        senhaPendente = null;
    }

    private void enviar(String email, String senha, boolean confirmarReativacao) {
        carregando.setValue(true);
        repositorioAutenticacao.entrar(email, senha, confirmarReativacao, new RetornoRepositorio<ResultadoLogin>() {
            @Override
            public void aoConcluir(ResultadoLogin resultado) {
                carregando.setValue(false);
                switch (resultado.getSituacao()) {
                    case AUTENTICADO:
                        emailPendente = null;
                        senhaPendente = null;
                        gerenciadorSessao.salvar(resultado.getSessao());
                        sessaoAutenticada.setValue(resultado.getSessao());
                        break;
                    case CONTA_PAUSADA:
                        emailPendente = email;
                        senhaPendente = senha;
                        perguntarReativacao.setValue(true);
                        break;
                    case EMAIL_NAO_CONFIRMADO:
                    default:
                        mensagemErro.setValue(EMAIL_NAO_CONFIRMADO);
                        break;
                }
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando.setValue(false);
                mensagemErro.setValue(mensagem);
            }
        });
    }
}
