package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ItemCandidaturaBinding;
import com.acesso.app.databinding.TelaCandidaturasBinding;
import com.acesso.app.modelos.Candidatura;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.ExibidorSecoes;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelCandidaturas;

/** Minhas candidaturas (só pessoa candidata): vaga, empresa e situação. Toque abre a vaga. */
public class TelaCandidaturas extends TelaAutenticada {

    private TelaCandidaturasBinding componentes;
    private ViewModelCandidaturas viewModel;

    public static void abrir(Context contexto) {
        contexto.startActivity(new Intent(contexto, TelaCandidaturas.class));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        if (!sessaoValida()) {
            return;
        }
        if (sessao.ehEmpresa()) {
            // Candidaturas são da pessoa candidata; a empresa vê as recebidas no Painel.
            finish();
            return;
        }
        componentes = TelaCandidaturasBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.getRoot());
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());

        viewModel = new ViewModelProvider(this).get(ViewModelCandidaturas.class);
        viewModel.getCandidaturas().observe(this, estado -> {
            componentes.listaCandidaturas.removeAllViews();
            boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
            if (ExibidorEstado.mostrar(componentes.estado, estado, vazio,
                    getString(R.string.candidaturas_vazio), viewModel::carregar)) {
                for (Candidatura candidatura : estado.dados) {
                    componentes.listaCandidaturas.addView(criarItem(candidatura));
                }
            }
        });
        viewModel.carregar();
    }

    private View criarItem(Candidatura candidatura) {
        ItemCandidaturaBinding item = ItemCandidaturaBinding.inflate(getLayoutInflater(),
                componentes.listaCandidaturas, false);
        item.textoTitulo.setText(candidatura.tituloVaga);
        item.textoIniciaisEmpresa.setText(Rotulos.iniciais(candidatura.nomeEmpresa));
        ExibidorSecoes.mostrar(item.textoEmpresa, candidatura.nomeEmpresa);
        int status = Rotulos.statusCandidatura(candidatura.status);
        ExibidorSecoes.mostrar(item.textoStatus,
                status != 0 ? getString(R.string.candidatura_status, getString(status)) : null);
        ExibidorSecoes.mostrar(item.textoQuando, ExibidorSecoes.temTexto(candidatura.quando)
                ? getString(R.string.candidatura_enviada_quando, candidatura.quando) : null);
        if (candidatura.vagaId != null) {
            item.conteudoItem.setOnClickListener(v -> TelaVaga.abrir(this, candidatura.vagaId));
        }
        return item.getRoot();
    }
}
