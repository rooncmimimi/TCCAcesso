package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaConfirmarEmailBinding;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.ViewModelConfirmarEmail;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Confirmação do e-mail com o código de 6 dígitos que a API envia (cadastro de empresa e login de
 * conta ainda não confirmada). Termina com RESULT_OK quando o e-mail foi confirmado; quem abriu
 * decide o que fazer depois (na prática, entrar com a conta).
 */
public class TelaConfirmarEmail extends AppCompatActivity {

    private static final String EXTRA_EMAIL = "email";
    private static final String EXTRA_CODIGO_RECEM_ENVIADO = "codigoRecemEnviado";

    private TelaConfirmarEmailBinding componentes;
    private ViewModelConfirmarEmail viewModel;
    private String email;

    /**
     * @param codigoRecemEnviado true logo depois do cadastro (o servidor acabou de mandar o código e só
     *                           aceita outro envio depois de 60 s); false quando vem do login.
     */
    public static Intent intencao(Context contexto, String email, boolean codigoRecemEnviado) {
        return new Intent(contexto, TelaConfirmarEmail.class)
                .putExtra(EXTRA_EMAIL, email)
                .putExtra(EXTRA_CODIGO_RECEM_ENVIADO, codigoRecemEnviado);
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        email = getIntent().getStringExtra(EXTRA_EMAIL);
        if (email == null || email.trim().isEmpty()) {
            // Sem e-mail não há o que confirmar: quem abriu esta tela errou, então não fica uma tela vazia.
            finish();
            return;
        }

        componentes = TelaConfirmarEmailBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.getRoot());

        componentes.textoIntroducao.setText(getString(R.string.confirmar_email_introducao, email));

        viewModel = new ViewModelProvider(this).get(ViewModelConfirmarEmail.class);
        viewModel.iniciar(getIntent().getBooleanExtra(EXTRA_CODIGO_RECEM_ENVIADO, false));
        observarViewModel();

        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
        componentes.botaoConfirmar.setOnClickListener(v -> confirmar());
        componentes.botaoReenviar.setOnClickListener(v -> viewModel.reenviar(email));
        // Envia pelo botão do teclado virtual e também pelo Enter de um teclado físico.
        componentes.entradaCodigo.setOnEditorActionListener((v, acao, evento) -> {
            boolean enterFisico = evento != null && evento.getKeyCode() == KeyEvent.KEYCODE_ENTER
                    && evento.getAction() == KeyEvent.ACTION_DOWN;
            if (acao == EditorInfo.IME_ACTION_DONE || enterFisico) {
                confirmar();
                return true;
            }
            return false;
        });
    }

    private void confirmar() {
        viewModel.confirmar(email, String.valueOf(componentes.entradaCodigo.getText()));
    }

    private void observarViewModel() {
        viewModel.getErroCodigo().observe(this, componentes.campoCodigo::setError);

        viewModel.estaCarregando().observe(this, carregando -> {
            componentes.botaoConfirmar.setEnabled(!carregando);
            componentes.botaoConfirmar.setText(carregando ? R.string.acao_confirmando : R.string.acao_confirmar_email);
            atualizarBotaoReenviar();
            if (carregando) {
                MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.acao_confirmando));
            } else if (viewModel.getMensagemErro().getValue() == null
                    && !Boolean.TRUE.equals(viewModel.foiReenvioPedido().getValue())) {
                MensagemStatus.esconder(componentes.mensagemStatus);
            }
        });

        viewModel.getSegundosParaReenviar().observe(this, segundos -> atualizarBotaoReenviar());

        viewModel.getMensagemErro().observe(this, mensagem -> {
            if (mensagem != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, mensagem);
            }
        });

        viewModel.foiReenvioPedido().observe(this, pedido -> {
            if (pedido) {
                MensagemStatus.mostrarSucesso(componentes.mensagemStatus, getString(R.string.confirmar_email_reenviado));
            }
        });

        viewModel.foiConfirmado().observe(this, confirmado -> {
            if (confirmado) {
                avisarConfirmacao();
            }
        });
    }

    /** O reenvio fica desligado durante qualquer chamada e durante a espera de 60 s do servidor. */
    private void atualizarBotaoReenviar() {
        Integer segundos = viewModel.getSegundosParaReenviar().getValue();
        boolean esperando = segundos != null && segundos > 0;
        boolean carregando = Boolean.TRUE.equals(viewModel.estaCarregando().getValue());
        componentes.botaoReenviar.setEnabled(!esperando && !carregando);
        componentes.botaoReenviar.setText(esperando
                ? getString(R.string.acao_reenviar_codigo_espera, segundos)
                : getString(R.string.acao_reenviar_codigo));
    }

    private void avisarConfirmacao() {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.confirmar_email_sucesso_titulo)
                .setMessage(R.string.confirmar_email_sucesso_mensagem)
                .setCancelable(false)
                .setPositiveButton(R.string.acao_continuar, (dialogo, botao) -> {
                    setResult(RESULT_OK);
                    finish();
                })
                .show();
    }
}
