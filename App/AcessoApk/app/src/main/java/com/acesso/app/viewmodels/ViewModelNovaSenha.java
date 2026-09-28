package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.servicos.TradutorErrosSupabase;
import com.acesso.app.utilitarios.Validador;

public class ViewModelNovaSenha extends AndroidViewModel {

    private static final String LINK_INVALIDO =
            "Este link de recuperação é inválido ou expirou. Peça um novo link.";

    private final RepositorioAutenticacao repositorioAutenticacao;

    private final MutableLiveData<String> erroSenha = new MutableLiveData<>();
    private final MutableLiveData<String> erroConfirmacao = new MutableLiveData<>();
    private final MutableLiveData<String> mensagemErro = new MutableLiveData<>();
    private final MutableLiveData<Boolean> carregando = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> senhaAlterada = new MutableLiveData<>(false);

    public ViewModelNovaSenha(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = new RepositorioAutenticacao(aplicacao);
    }

    public LiveData<String> getErroSenha() {
        return erroSenha;
    }

    public LiveData<String> getErroConfirmacao() {
        return erroConfirmacao;
    }

    public LiveData<String> getMensagemErro() {
        return mensagemErro;
    }

    public LiveData<Boolean> estaCarregando() {
        return carregando;
    }

    public LiveData<Boolean> foiSenhaAlterada() {
        return senhaAlterada;
    }

    public void alterarSenha(String tokenRecuperacao, String senha, String confirmacao) {
        if (Boolean.TRUE.equals(carregando.getValue())) {
            return;
        }
        mensagemErro.setValue(null);
        String problemaSenha = Validador.validarNovaSenha(senha);
        String problemaConfirmacao = Validador.validarConfirmacaoSenha(senha, confirmacao);
        erroSenha.setValue(problemaSenha);
        erroConfirmacao.setValue(problemaConfirmacao);
        if (problemaSenha != null || problemaConfirmacao != null) {
            return;
        }
        if (tokenRecuperacao == null) {
            mensagemErro.setValue(LINK_INVALIDO);
            return;
        }

        carregando.setValue(true);
        repositorioAutenticacao.alterarSenha(tokenRecuperacao, senha, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                carregando.setValue(false);
                senhaAlterada.setValue(true);
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando.setValue(false);
                // Token do link vencido ou já usado: explica em vez de falar em "sessão".
                mensagemErro.setValue(TradutorErrosSupabase.SESSAO_EXPIRADA.equals(mensagem)
                        ? LINK_INVALIDO
                        : mensagem);
            }
        });
    }
}
