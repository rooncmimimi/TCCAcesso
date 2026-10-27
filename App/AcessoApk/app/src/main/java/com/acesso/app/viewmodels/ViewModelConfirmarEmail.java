package com.acesso.app.viewmodels;

import android.app.Application;
import android.os.CountDownTimer;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.Validador;

/**
 * Confirmação de e-mail por código de 6 dígitos (POST /auth/cadastro/confirmar-email).
 *
 * O servidor só envia um código novo depois de 60 s do anterior e responde sempre a mesma coisa,
 * existindo código novo ou não. Por isso o botão de reenvio espera o mesmo tempo, em vez de
 * deixar a pessoa tocar sem efeito. Vindo do cadastro, o código acabou de sair e a espera já
 * começa; vindo do login, não há código recente e o reenvio fica liberado.
 */
public class ViewModelConfirmarEmail extends AndroidViewModel {

    /** SEGUNDOS_COOLDOWN_REENVIO em AutenticacaoService.js. */
    static final int ESPERA_REENVIO_SEGUNDOS = 60;

    private final RepositorioAutenticacao repositorioAutenticacao;

    private final MutableLiveData<String> erroCodigo = new MutableLiveData<>();
    private final MutableLiveData<String> mensagemErro = new MutableLiveData<>();
    private final MutableLiveData<Boolean> reenvioPedido = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> carregando = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> confirmado = new MutableLiveData<>(false);
    private final MutableLiveData<Integer> segundosParaReenviar = new MutableLiveData<>(0);

    private CountDownTimer contagem;
    private boolean iniciado;

    public ViewModelConfirmarEmail(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = FabricaRepositorios.autenticacao(aplicacao);
    }

    public LiveData<String> getErroCodigo() {
        return erroCodigo;
    }

    public LiveData<String> getMensagemErro() {
        return mensagemErro;
    }

    /** true depois de um reenvio aceito pelo servidor (a tela mostra o aviso). */
    public LiveData<Boolean> foiReenvioPedido() {
        return reenvioPedido;
    }

    /** Vale para confirmar e para reenviar: só uma chamada por vez. */
    public LiveData<Boolean> estaCarregando() {
        return carregando;
    }

    public LiveData<Boolean> foiConfirmado() {
        return confirmado;
    }

    /** Segundos até o reenvio liberar; 0 quando já pode reenviar. */
    public LiveData<Integer> getSegundosParaReenviar() {
        return segundosParaReenviar;
    }

    /**
     * Chamado uma vez ao abrir a tela (as chamadas seguintes, como numa rotação, são ignoradas).
     *
     * @param codigoRecemEnviado true quando o servidor acabou de mandar um código (logo depois do cadastro).
     */
    public void iniciar(boolean codigoRecemEnviado) {
        if (iniciado) {
            return;
        }
        iniciado = true;
        if (codigoRecemEnviado) {
            iniciarEspera();
        }
    }

    public void confirmar(String email, String codigo) {
        if (Boolean.TRUE.equals(carregando.getValue())) {
            return;
        }
        mensagemErro.setValue(null);
        reenvioPedido.setValue(false);
        String problema = Validador.validarCodigoEmail(codigo);
        erroCodigo.setValue(problema);
        if (problema != null) {
            return;
        }

        carregando.setValue(true);
        repositorioAutenticacao.confirmarEmail(email, codigo, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                carregando.setValue(false);
                confirmado.setValue(true);
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando.setValue(false);
                mensagemErro.setValue(mensagem);
            }
        });
    }

    public void reenviar(String email) {
        if (Boolean.TRUE.equals(carregando.getValue()) || segundosRestantes() > 0) {
            return;
        }
        mensagemErro.setValue(null);
        erroCodigo.setValue(null);
        reenvioPedido.setValue(false);

        carregando.setValue(true);
        repositorioAutenticacao.reenviarCodigoEmail(email, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                carregando.setValue(false);
                reenvioPedido.setValue(true);
                iniciarEspera();
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando.setValue(false);
                mensagemErro.setValue(mensagem);
            }
        });
    }

    private int segundosRestantes() {
        Integer segundos = segundosParaReenviar.getValue();
        return segundos != null ? segundos : 0;
    }

    private void iniciarEspera() {
        cancelarContagem();
        segundosParaReenviar.setValue(ESPERA_REENVIO_SEGUNDOS);
        contagem = new CountDownTimer(ESPERA_REENVIO_SEGUNDOS * 1000L, 1000L) {
            @Override
            public void onTick(long faltamMillis) {
                // Arredonda para cima: com 59,2 s faltando a tela mostra 60, e com 0,4 s mostra 1.
                segundosParaReenviar.setValue((int) ((faltamMillis + 999) / 1000));
            }

            @Override
            public void onFinish() {
                segundosParaReenviar.setValue(0);
            }
        };
        contagem.start();
    }

    private void cancelarContagem() {
        if (contagem != null) {
            contagem.cancel();
            contagem = null;
        }
    }

    @Override
    protected void onCleared() {
        cancelarContagem();
    }
}
