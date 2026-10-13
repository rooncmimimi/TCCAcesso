package com.acesso.app.telas;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaEsqueciSenhaBinding;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.ViewModelEsqueciSenha;

public class TelaEsqueciSenha extends AppCompatActivity {

    private TelaEsqueciSenhaBinding componentes;
    private ViewModelEsqueciSenha viewModel;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        componentes = TelaEsqueciSenhaBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());

        viewModel = new ViewModelProvider(this).get(ViewModelEsqueciSenha.class);

        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
        componentes.botaoEnviar.setOnClickListener(v ->
                viewModel.enviarLink(String.valueOf(componentes.entradaEmail.getText())));

        viewModel.getErroEmail().observe(this, componentes.campoEmail::setError);
        viewModel.estaCarregando().observe(this, carregando -> {
            componentes.botaoEnviar.setEnabled(!carregando);
            componentes.botaoEnviar.setText(carregando ? R.string.acao_enviando : R.string.acao_enviar_link);
            if (carregando) {
                MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.acao_enviando));
            }
        });
        viewModel.getMensagemErro().observe(this, mensagem -> {
            if (mensagem != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, mensagem);
            }
        });
        viewModel.foiEmailEnviado().observe(this, enviado -> {
            if (enviado) {
                MensagemStatus.mostrarSucesso(componentes.mensagemStatus, getString(R.string.esqueci_enviado));
            }
        });
    }
}
