package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.Validador;

public class ViewModelEsqueciSenha extends AndroidViewModel {

    private final RepositorioAutenticacao repositorioAutenticacao;

    private final MutableLiveData<String> erroEmail = new MutableLiveData<>();
    private final MutableLiveData<String> mensagemErro = new MutableLiveData<>();
    private final MutableLiveData<Boolean> carregando = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> emailEnviado = new MutableLiveData<>(false);

    public ViewModelEsqueciSenha(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = new RepositorioAutenticacao(aplicacao);
    }

    public LiveData<String> getErroEmail() {
        return erroEmail;
    }

    public LiveData<String> getMensagemErro() {
        return mensagemErro;
    }

    public LiveData<Boolean> estaCarregando() {
        return carregando;
    }

    public LiveData<Boolean> foiEmailEnviado() {
        return emailEnviado;
    }

    public void enviarLink(String email) {
        if (Boolean.TRUE.equals(carregando.getValue())) {
            return;
        }
        mensagemErro.setValue(null);
        String problema = Validador.validarEmail(email);
        erroEmail.setValue(problema);
        if (problema != null) {
            return;
        }

        carregando.setValue(true);
        repositorioAutenticacao.enviarLinkNovaSenha(email, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                carregando.setValue(false);
                emailEnviado.setValue(true);
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando.setValue(false);
                mensagemErro.setValue(mensagem);
            }
        });
    }
}
