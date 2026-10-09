package com.acesso.app.telas;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.EditorInfo;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaLoginBinding;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.Navegacao;
import com.acesso.app.viewmodels.ViewModelLogin;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Login com e-mail e senha. Aberta pela apresentação (Voltar retorna a ela).
 * Só sai daqui quando o servidor devolve uma sessão: aí vai para a área do tipo de conta,
 * limpando a pilha para que Voltar não traga de volta o login nem a apresentação.
 */
public class TelaLogin extends AppCompatActivity {

    private TelaLoginBinding componentes;
    private ViewModelLogin viewModel;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        componentes = TelaLoginBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.raiz);

        boolean demonstracao = FabricaRepositorios.modoDemonstracao();
        componentes.avisoDemonstracao.getRoot().setVisibility(demonstracao ? View.VISIBLE : View.GONE);
        componentes.textoContasDemonstracao.setVisibility(demonstracao ? View.VISIBLE : View.GONE);

        viewModel = new ViewModelProvider(this).get(ViewModelLogin.class);
        observarViewModel();

        componentes.botaoEntrar.setOnClickListener(v -> enviar());
        componentes.entradaSenha.setOnEditorActionListener((v, acao, evento) -> {
            if (acao == EditorInfo.IME_ACTION_DONE) {
                enviar();
                return true;
            }
            return false;
        });
        componentes.botaoEsqueciSenha.setOnClickListener(v ->
                startActivity(new Intent(this, TelaEsqueciSenha.class)));
        componentes.botaoCriarConta.setOnClickListener(v ->
                startActivity(new Intent(this, TelaCadastro.class)));
    }

    private void enviar() {
        viewModel.entrar(
                String.valueOf(componentes.entradaEmail.getText()),
                String.valueOf(componentes.entradaSenha.getText()));
    }

    private void observarViewModel() {
        viewModel.getErroEmail().observe(this, componentes.campoEmail::setError);
        viewModel.getErroSenha().observe(this, componentes.campoSenha::setError);

        viewModel.estaCarregando().observe(this, carregando -> {
            componentes.botaoEntrar.setEnabled(!carregando);
            componentes.botaoCriarConta.setEnabled(!carregando);
            componentes.botaoEsqueciSenha.setEnabled(!carregando);
            componentes.botaoEntrar.setText(carregando ? R.string.acao_entrando : R.string.acao_entrar);
            if (carregando) {
                MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.acao_entrando));
            } else if (viewModel.getMensagemErro().getValue() == null) {
                MensagemStatus.esconder(componentes.mensagemStatus);
            }
        });

        viewModel.getMensagemErro().observe(this, mensagem -> {
            if (mensagem != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, mensagem);
            }
        });

        viewModel.getSessaoAutenticada().observe(this, sessao -> {
            if (sessao != null) {
                Navegacao.abrirAreaAutenticada(this, sessao);
            }
        });

        viewModel.devePerguntarReativacao().observe(this, perguntar -> {
            if (perguntar) {
                perguntarReativacao();
            }
        });
    }

    private void perguntarReativacao() {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.login_reativar_titulo)
                .setMessage(R.string.login_reativar_mensagem)
                .setCancelable(false)
                .setNegativeButton(R.string.cancelar, (dialogo, botao) -> viewModel.cancelarReativacao())
                .setPositiveButton(R.string.acao_reativar, (dialogo, botao) -> viewModel.reativarConta())
                .show();
    }
}
