package com.acesso.app.telas;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaNovaSenhaBinding;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.ViewModelNovaSenha;

/**
 * Aberta pelo link do e-mail de recuperação (acesso://redefinir-senha).
 * O Supabase coloca um token temporário depois do "#" do link; com ele
 * o app consegue trocar a senha sem o usuário estar logado.
 */
public class TelaNovaSenha extends AppCompatActivity {

    private TelaNovaSenhaBinding componentes;
    private ViewModelNovaSenha viewModel;
    private String tokenRecuperacao;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        componentes = TelaNovaSenhaBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());

        viewModel = new ViewModelProvider(this).get(ViewModelNovaSenha.class);
        tokenRecuperacao = lerTokenRecuperacao(getIntent().getData());

        componentes.barraSuperior.setNavigationOnClickListener(v -> irParaLogin());
        componentes.botaoSalvar.setOnClickListener(v -> viewModel.alterarSenha(
                tokenRecuperacao,
                String.valueOf(componentes.entradaSenha.getText()),
                String.valueOf(componentes.entradaConfirmacaoSenha.getText())));

        if (tokenRecuperacao == null) {
            MensagemStatus.mostrarErro(componentes.mensagemStatus, getString(R.string.nova_senha_link_invalido));
        }

        viewModel.getErroSenha().observe(this, componentes.campoSenha::setError);
        viewModel.getErroConfirmacao().observe(this, componentes.campoConfirmacaoSenha::setError);
        viewModel.estaCarregando().observe(this, carregando -> {
            componentes.botaoSalvar.setEnabled(!carregando);
            componentes.botaoSalvar.setText(carregando ? R.string.acao_salvando : R.string.acao_salvar_senha);
            if (carregando) {
                MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.acao_salvando));
            }
        });
        viewModel.getMensagemErro().observe(this, mensagem -> {
            if (mensagem != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, mensagem);
            }
        });
        viewModel.foiSenhaAlterada().observe(this, alterada -> {
            if (alterada) {
                Toast.makeText(this, R.string.nova_senha_sucesso, Toast.LENGTH_LONG).show();
                irParaLogin();
            }
        });
    }

    /** Lê o access_token de um link como acesso://redefinir-senha#access_token=...&type=recovery */
    static String lerTokenRecuperacao(Uri endereco) {
        if (endereco == null || endereco.getFragment() == null) {
            return null;
        }
        Uri parametros = Uri.parse("acesso://x?" + endereco.getFragment());
        if (!"recovery".equals(parametros.getQueryParameter("type"))) {
            return null;
        }
        return parametros.getQueryParameter("access_token");
    }

    private void irParaLogin() {
        Intent intencao = new Intent(this, TelaLogin.class);
        intencao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intencao);
        finish();
    }
}
