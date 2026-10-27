package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import com.acesso.app.databinding.TelaPesquisaBinding;
import com.acesso.app.utilitarios.MargensSistema;

/**
 * Pesquisa de pessoas, empresas e vagas, aberta pelo campo de busca do cabeçalho (ou por "Nova mensagem",
 * para achar com quem conversar). O conteúdo é o FragmentoPesquisa.
 */
public class TelaPesquisa extends TelaAutenticada {

    public static void abrir(Context contexto) {
        contexto.startActivity(new Intent(contexto, TelaPesquisa.class));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        if (!sessaoValida()) {
            return;
        }
        TelaPesquisaBinding componentes = TelaPesquisaBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.getRoot());
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
    }
}
