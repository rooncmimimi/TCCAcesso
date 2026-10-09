package com.acesso.app.telas;

import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaStatusEmpresaBinding;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.utilitarios.AtalhosSistema;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.Navegacao;
import com.acesso.app.viewmodels.ViewModelSessao;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Empresa logada mas ainda não aprovada (pendente, reprovada ou suspensa), como a
 * TelaStatusEmpresa do site: mostra a situação e só permite sair ou falar com a equipe.
 * A liberação de verdade é da API: o app só esconde o que a empresa ainda não pode usar.
 */
public class TelaStatusEmpresa extends AppCompatActivity {

    private TelaStatusEmpresaBinding componentes;
    private ViewModelSessao viewModelSessao;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);

        viewModelSessao = new ViewModelProvider(this).get(ViewModelSessao.class);
        SessaoUsuario sessao = viewModelSessao.getSessao().getValue();
        Navegacao.Destino destino = Navegacao.destinoPara(sessao);
        if (destino == Navegacao.Destino.APRESENTACAO) {
            Navegacao.voltarParaApresentacao(this, null);
            return;
        }
        if (destino != Navegacao.Destino.EMPRESA_EM_ANALISE) {
            Navegacao.abrirAreaAutenticada(this, sessao);
            return;
        }

        componentes = TelaStatusEmpresaBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.raiz);

        componentes.avisoDemonstracao.getRoot().setVisibility(
                FabricaRepositorios.modoDemonstracao() ? View.VISIBLE : View.GONE);
        componentes.botaoSair.setOnClickListener(v -> confirmarSaida());
        componentes.botaoFaleConosco.setOnClickListener(v -> {
            if (!AtalhosSistema.escreverParaEquipe(this)) {
                Toast.makeText(this, R.string.sem_app_email, Toast.LENGTH_LONG).show();
            }
        });

        viewModelSessao.getSessaoEncerrada().observe(this, aviso ->
                Navegacao.voltarParaApresentacao(this, aviso == null || aviso.isEmpty() ? null : aviso));
        viewModelSessao.getSessao().observe(this, atualizada -> {
            if (Navegacao.destinoPara(atualizada) == Navegacao.Destino.EMPRESA_EM_ANALISE) {
                mostrarSituacao(atualizada.getStatusEmpresa());
            } else if (atualizada != null) {
                // A renovação trouxe a empresa já aprovada: libera a área da empresa.
                Navegacao.abrirAreaAutenticada(this, atualizada);
            }
        });
        viewModelSessao.verificar();
    }

    private void mostrarSituacao(String status) {
        int titulo;
        int texto;
        int icone;
        if ("suspensa".equals(status)) {
            titulo = R.string.status_empresa_titulo_suspensa;
            texto = R.string.status_empresa_texto_suspensa;
            icone = R.drawable.ic_aviso;
        } else if ("reprovada".equals(status)) {
            titulo = R.string.status_empresa_titulo_reprovada;
            texto = R.string.status_empresa_texto_reprovada;
            icone = R.drawable.ic_aviso;
        } else {
            titulo = R.string.status_empresa_titulo_pendente;
            texto = R.string.status_empresa_texto_pendente;
            icone = R.drawable.ic_ampulheta;
        }
        componentes.textoTitulo.setText(titulo);
        componentes.textoDescricao.setText(texto);
        componentes.iconeStatus.setImageResource(icone);
    }

    private void confirmarSaida() {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.sair_confirmar_titulo)
                .setMessage(R.string.sair_confirmar_mensagem)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.acao_sair, (dialogo, botao) -> viewModelSessao.sair())
                .show();
    }
}
