package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;

import com.acesso.app.R;
import com.acesso.app.databinding.ComponenteSecaoBinding;
import com.acesso.app.databinding.TelaAcessibilidadeBinding;
import com.acesso.app.utilitarios.AtalhosSistema;
import com.acesso.app.utilitarios.MargensSistema;

/**
 * Guia dos recursos de acessibilidade do próprio Android (TalkBack, tamanho do texto, ampliação,
 * contraste...): o que cada um faz, como ativar e um botão para as configurações. O app não refaz o
 * que o sistema já oferece; ele funciona com esses recursos e ajuda a encontrá-los. Aberta pela
 * apresentação ("Configurar acessibilidade agora") e pelo Perfil, com ou sem conta.
 */
public class TelaAcessibilidade extends AppCompatActivity {

    public static void abrir(Context contexto) {
        contexto.startActivity(new Intent(contexto, TelaAcessibilidade.class));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        TelaAcessibilidadeBinding componentes = TelaAcessibilidadeBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.getRoot());

        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
        componentes.botaoAbrirConfiguracoes.setOnClickListener(v -> AtalhosSistema.abrirConfiguracoesAcessibilidade(this));
        componentes.botaoAbrirConfiguracoesFim.setOnClickListener(v -> AtalhosSistema.abrirConfiguracoesAcessibilidade(this));

        String[] nomes = getResources().getStringArray(R.array.guia_recursos_nomes);
        String[] descricoes = getResources().getStringArray(R.array.guia_recursos_descricoes);
        String[] caminhos = getResources().getStringArray(R.array.guia_recursos_caminhos);
        for (int i = 0; i < nomes.length; i++) {
            ComponenteSecaoBinding cartao = ComponenteSecaoBinding.inflate(getLayoutInflater(), componentes.listaRecursos, false);
            cartao.tituloSecao.setText(nomes[i]);
            cartao.textoSecao.setText(getString(R.string.guia_recurso_texto, descricoes[i], caminhos[i]));
            cartao.textoSecao.setVisibility(View.VISIBLE);
            cartao.getRoot().setVisibility(View.VISIBLE);
            componentes.listaRecursos.addView(cartao.getRoot());
        }
    }
}
