package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputFilter;
import android.view.View;
import android.widget.LinearLayout;

import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaVagaBinding;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.utilitarios.CartaoVaga;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.ExibidorImagem;
import com.acesso.app.utilitarios.ExibidorSecoes;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.EstadoConteudo;
import com.acesso.app.viewmodels.ViewModelVaga;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Detalhe da vaga (página /vaga/:id do site). Pessoa candidata vê "Candidatar-se" (com apresentação
 * opcional, como no site); empresa só lê. A API decide de novo se a candidatura é aceita.
 */
public class TelaVaga extends TelaAutenticada {

    private static final String EXTRA_VAGA_ID = "vaga_id";
    private static final int LIMITE_APRESENTACAO = 2000;

    private TelaVagaBinding componentes;
    private ViewModelVaga viewModel;

    public static void abrir(Context contexto, String vagaId) {
        if (vagaId == null) {
            return;
        }
        contexto.startActivity(new Intent(contexto, TelaVaga.class).putExtra(EXTRA_VAGA_ID, vagaId));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        String vagaId = getIntent().getStringExtra(EXTRA_VAGA_ID);
        if (!sessaoValida() || vagaId == null) {
            finish();
            return;
        }
        componentes = TelaVagaBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.getRoot());
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());

        viewModel = new ViewModelProvider(this).get(ViewModelVaga.class);
        viewModel.getVaga().observe(this, this::mostrarVaga);
        viewModel.getCandidatura().observe(this, this::mostrarSituacaoCandidatura);
        viewModel.getResultadoCandidatura().observe(this, resultado -> {
            if (resultado == null) {
                return;
            }
            if (resultado.dados != null) {
                MensagemStatus.mostrarSucesso(componentes.mensagemStatus, resultado.dados);
            } else if (resultado.mensagem != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, resultado.mensagem);
            }
        });
        componentes.botaoCandidatar.setOnClickListener(v -> confirmarCandidatura());
        viewModel.carregar(vagaId);
    }

    private void mostrarVaga(EstadoConteudo<Vaga> estado) {
        boolean pronto = ExibidorEstado.mostrar(componentes.estado, estado, false, null, viewModel::recarregar);
        componentes.conteudo.setVisibility(pronto ? View.VISIBLE : View.GONE);
        if (!pronto) {
            return;
        }
        Vaga vaga = estado.dados;
        componentes.textoTitulo.setText(vaga.titulo);
        componentes.textoIniciaisEmpresa.setText(Rotulos.iniciais(vaga.nomeEmpresa));
        ExibidorImagem.logo(componentes.imagemLogoEmpresa, vaga.logoEmpresaUrl,
                getResources().getDimensionPixelSize(R.dimen.tamanho_logo_empresa_detalhe));
        componentes.botaoEmpresa.setText(vaga.nomeEmpresa);
        componentes.botaoEmpresa.setCompoundDrawablesRelativeWithIntrinsicBounds(
                0, 0, vaga.empresaVerificada ? R.drawable.ic_verificado : 0, 0);
        componentes.botaoEmpresa.setContentDescription(getString(R.string.vaga_ver_empresa) + ": " + vaga.nomeEmpresa
                + (vaga.empresaVerificada ? ", " + getString(R.string.vaga_empresa_verificada) : ""));
        if (vaga.empresaUsuarioId != null) {
            componentes.botaoEmpresa.setOnClickListener(v -> TelaPerfilUsuario.abrir(this, vaga.empresaUsuarioId));
        } else {
            componentes.botaoEmpresa.setClickable(false);
        }
        componentes.textoLocal.setText(CartaoVaga.local(this, vaga));
        ExibidorSecoes.mostrar(componentes.textoQuando,
                ExibidorSecoes.temTexto(vaga.quando) ? getString(R.string.vaga_publicada, vaga.quando) : null);

        componentes.grupoSelos.removeAllViews();
        if (vaga.publicoAlvo != null && !"geral".equals(vaga.publicoAlvo) && Rotulos.de(vaga.publicoAlvo) != 0) {
            CartaoVaga.adicionarSelo(componentes.grupoSelos, getString(Rotulos.de(vaga.publicoAlvo)), true);
        }
        if (Rotulos.statusVaga(vaga.status) != 0) {
            CartaoVaga.adicionarSelo(componentes.grupoSelos, getString(Rotulos.statusVaga(vaga.status)), false);
        }

        boolean aberta = "aberta".equals(vaga.status);
        boolean pessoa = !sessao.ehEmpresa();
        componentes.textoVagaFechada.setVisibility(aberta ? View.GONE : View.VISIBLE);
        componentes.botaoCandidatar.setVisibility(pessoa && aberta ? View.VISIBLE : View.GONE);

        ExibidorSecoes.texto(componentes.secaoDescricao, R.string.vaga_secao_descricao, vaga.descricao);
        ExibidorSecoes.texto(componentes.secaoRequisitos, R.string.vaga_secao_requisitos, vaga.requisitos);
        ExibidorSecoes.texto(componentes.secaoBeneficios, R.string.vaga_secao_beneficios, vaga.beneficios);
        ExibidorSecoes.linhas(componentes.secaoDetalhes, R.string.vaga_secao_detalhes, Arrays.asList(
                rotuloOuNulo(R.string.vaga_contrato, Rotulos.de(vaga.contrato)),
                rotuloOuNulo(R.string.vaga_publico, Rotulos.de(vaga.publicoAlvo)),
                vaga.salario != null ? getString(R.string.vaga_salario, vaga.salario) : null,
                ExibidorSecoes.temTexto(vaga.cargaHoraria) ? getString(R.string.vaga_carga_horaria, vaga.cargaHoraria) : null));
        List<String> recursos = new ArrayList<>();
        for (String recurso : vaga.recursosAcessibilidade) {
            if (Rotulos.de(recurso) != 0) {
                recursos.add(getString(Rotulos.de(recurso)));
            }
        }
        ExibidorSecoes.selos(componentes.secaoAcessibilidade, R.string.vaga_secao_acessibilidade, recursos);
    }

    private String rotuloOuNulo(int formato, int rotulo) {
        return rotulo != 0 ? getString(formato, getString(rotulo)) : null;
    }

    private void mostrarSituacaoCandidatura(ViewModelVaga.SituacaoCandidatura situacao) {
        componentes.botaoCandidatar.setEnabled(situacao == ViewModelVaga.SituacaoCandidatura.DISPONIVEL);
        switch (situacao) {
            case ENVIANDO:
                componentes.botaoCandidatar.setText(R.string.vaga_candidatando);
                break;
            case ENVIADA:
                componentes.botaoCandidatar.setText(R.string.vaga_candidatura_enviada);
                componentes.botaoCandidatar.setIconResource(R.drawable.ic_sucesso);
                break;
            default:
                componentes.botaoCandidatar.setText(R.string.vaga_candidatar);
                break;
        }
    }

    /** Como no site: apresentação opcional (até 2000 caracteres) antes de enviar. */
    private void confirmarCandidatura() {
        TextInputLayout campo = new TextInputLayout(this);
        campo.setHint(R.string.vaga_candidatura_mensagem);
        campo.setCounterEnabled(true);
        campo.setCounterMaxLength(LIMITE_APRESENTACAO);
        TextInputEditText entrada = new TextInputEditText(campo.getContext());
        entrada.setMinLines(3);
        entrada.setMaxLines(6);
        entrada.setFilters(new InputFilter[]{new InputFilter.LengthFilter(LIMITE_APRESENTACAO)});
        campo.addView(entrada, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        int margem = getResources().getDimensionPixelSize(R.dimen.margem_tela);
        LinearLayout recipiente = new LinearLayout(this);
        recipiente.setPadding(margem, margem / 2, margem, 0);
        recipiente.addView(campo, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.vaga_candidatura_dialogo_titulo)
                .setMessage(R.string.vaga_candidatura_dialogo_texto)
                .setView(recipiente)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.vaga_candidatura_confirmar, (dialogo, botao) ->
                        viewModel.candidatar(String.valueOf(entrada.getText()).trim(),
                                getString(R.string.vaga_candidatura_sucesso)))
                .show();
    }
}
