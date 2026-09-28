package com.acesso.app.telas;

import android.content.Intent;
import android.os.Bundle;
import android.view.inputmethod.EditorInfo;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaLoginBinding;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.ViewModelLogin;

/** Primeira tela do app. Se já houver sessão salva, vai direto para a tela principal. */
public class TelaLogin extends AppCompatActivity {

    private TelaLoginBinding componentes;
    private ViewModelLogin viewModel;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        componentes = TelaLoginBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());

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

        if (estadoSalvo == null) {
            viewModel.verificarSessaoSalva();
        }
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

        viewModel.estaLogado().observe(this, logado -> {
            if (logado) {
                abrirTelaPrincipal();
            }
        });
    }

    private void abrirTelaPrincipal() {
        Intent intencao = new Intent(this, TelaPrincipal.class);
        intencao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intencao);
        finish();
    }
}
