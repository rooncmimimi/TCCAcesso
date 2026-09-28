package com.acesso.app.telas;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaCadastroBinding;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.ViewModelCadastro;
import com.google.android.material.datepicker.CalendarConstraints;
import com.google.android.material.datepicker.DateValidatorPointBackward;
import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public class TelaCadastro extends AppCompatActivity {

    private static final DateTimeFormatter DATA_BRASILEIRA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private TelaCadastroBinding componentes;
    private ViewModelCadastro viewModel;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        componentes = TelaCadastroBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());

        viewModel = new ViewModelProvider(this).get(ViewModelCadastro.class);
        observarViewModel();

        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
        componentes.campoDataNascimento.setEndIconOnClickListener(v -> abrirCalendario());
        componentes.botaoLerTermos.setOnClickListener(v ->
                startActivity(new Intent(this, TelaTermos.class)));
        componentes.botaoIrParaLogin.setOnClickListener(v -> finish());
        componentes.botaoCadastrar.setOnClickListener(v -> enviar());
    }

    private void enviar() {
        ViewModelCadastro.Formulario formulario = new ViewModelCadastro.Formulario();
        formulario.nome = String.valueOf(componentes.entradaNomeCompleto.getText());
        formulario.email = String.valueOf(componentes.entradaEmail.getText());
        formulario.senha = String.valueOf(componentes.entradaSenha.getText());
        formulario.confirmacaoSenha = String.valueOf(componentes.entradaConfirmacaoSenha.getText());
        formulario.cidade = String.valueOf(componentes.entradaCidade.getText());
        formulario.dataNascimento = String.valueOf(componentes.entradaDataNascimento.getText());
        formulario.aceitouTermos = componentes.caixaTermos.isChecked();
        viewModel.cadastrar(formulario);
    }

    /** Calendário como alternativa a digitar a data. Só permite datas no passado. */
    private void abrirCalendario() {
        CalendarConstraints restricoes = new CalendarConstraints.Builder()
                .setValidator(DateValidatorPointBackward.now())
                .build();
        MaterialDatePicker<Long> calendario = MaterialDatePicker.Builder.datePicker()
                .setTitleText(R.string.titulo_calendario_nascimento)
                .setInputMode(MaterialDatePicker.INPUT_MODE_TEXT)
                .setCalendarConstraints(restricoes)
                .build();
        calendario.addOnPositiveButtonClickListener(dataEscolhida -> {
            String data = Instant.ofEpochMilli(dataEscolhida).atZone(ZoneOffset.UTC).toLocalDate().format(DATA_BRASILEIRA);
            componentes.entradaDataNascimento.setText(data);
        });
        calendario.show(getSupportFragmentManager(), "calendario_nascimento");
    }

    private void observarViewModel() {
        viewModel.getErrosFormulario().observe(this, erros -> {
            componentes.campoNomeCompleto.setError(erros.nome);
            componentes.campoEmail.setError(erros.email);
            componentes.campoSenha.setError(erros.senha);
            componentes.campoConfirmacaoSenha.setError(erros.confirmacaoSenha);
            componentes.campoCidade.setError(erros.cidade);
            componentes.campoDataNascimento.setError(erros.dataNascimento);
            if (erros.termos != null) {
                componentes.erroTermos.setText(erros.termos);
                componentes.erroTermos.setVisibility(View.VISIBLE);
            } else {
                componentes.erroTermos.setVisibility(View.GONE);
            }
            focarPrimeiroErro(erros);
        });

        viewModel.estaCarregando().observe(this, carregando -> {
            componentes.botaoCadastrar.setEnabled(!carregando);
            componentes.botaoCadastrar.setText(carregando ? R.string.acao_cadastrando : R.string.acao_cadastrar);
            if (carregando) {
                MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.acao_cadastrando));
            } else if (viewModel.getMensagemErro().getValue() == null) {
                MensagemStatus.esconder(componentes.mensagemStatus);
            }
        });

        viewModel.getMensagemErro().observe(this, mensagem -> {
            if (mensagem != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, mensagem);
            }
        });

        viewModel.getDesfecho().observe(this, desfecho -> {
            if (desfecho == ViewModelCadastro.Desfecho.LOGADO) {
                Intent intencao = new Intent(this, TelaPrincipal.class);
                intencao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intencao);
                finish();
            } else if (desfecho == ViewModelCadastro.Desfecho.CONFIRMAR_EMAIL) {
                mostrarAvisoConfirmarEmail();
            }
        });
    }

    /** Leva o foco (e o TalkBack) ao primeiro campo com problema. */
    private void focarPrimeiroErro(ViewModelCadastro.ErrosFormulario erros) {
        if (erros.nome != null) componentes.entradaNomeCompleto.requestFocus();
        else if (erros.email != null) componentes.entradaEmail.requestFocus();
        else if (erros.senha != null) componentes.entradaSenha.requestFocus();
        else if (erros.confirmacaoSenha != null) componentes.entradaConfirmacaoSenha.requestFocus();
        else if (erros.cidade != null) componentes.entradaCidade.requestFocus();
        else if (erros.dataNascimento != null) componentes.entradaDataNascimento.requestFocus();
        else if (erros.termos != null) componentes.caixaTermos.requestFocus();
    }

    private void mostrarAvisoConfirmarEmail() {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.cadastro_confirmar_email_titulo)
                .setMessage(R.string.cadastro_confirmar_email_mensagem)
                .setCancelable(false)
                .setPositiveButton(R.string.acao_ir_para_login, (dialogo, botao) -> finish())
                .show();
    }
}
