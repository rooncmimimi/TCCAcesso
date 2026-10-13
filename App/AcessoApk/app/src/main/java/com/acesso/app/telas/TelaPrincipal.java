package com.acesso.app.telas;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaPrincipalBinding;
import com.acesso.app.fragmentos.FragmentoEmConstrucao;
import com.acesso.app.utilitarios.GerenciadorSessao;

/**
 * Tela principal depois do login, com a barra de navegação inferior.
 * Cada aba troca o fragmento exibido. Por enquanto as abas mostram um
 * aviso de "em desenvolvimento"; elas serão construídas nas próximas fases.
 */
public class TelaPrincipal extends AppCompatActivity {

    private TelaPrincipalBinding componentes;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);

        if (new GerenciadorSessao(this).obter() == null) {
            irParaLogin();
            return;
        }

        componentes = TelaPrincipalBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());

        componentes.navegacaoInferior.setOnItemSelectedListener(item -> {
            mostrarAba(item.getItemId());
            return true;
        });

        if (estadoSalvo == null) {
            componentes.navegacaoInferior.setSelectedItemId(R.id.aba_inicio);
        }
    }

    private void mostrarAba(int idAba) {
        Fragment fragmento;
        if (idAba == R.id.aba_oportunidades) {
            fragmento = FragmentoEmConstrucao.novaInstancia(R.string.aba_oportunidades, false);
        } else if (idAba == R.id.aba_criar) {
            fragmento = FragmentoEmConstrucao.novaInstancia(R.string.aba_criar, false);
        } else if (idAba == R.id.aba_pesquisa) {
            fragmento = FragmentoEmConstrucao.novaInstancia(R.string.aba_pesquisa, false);
        } else if (idAba == R.id.aba_perfil) {
            fragmento = FragmentoEmConstrucao.novaInstancia(R.string.aba_perfil, true);
        } else {
            fragmento = FragmentoEmConstrucao.novaInstancia(R.string.aba_inicio, false);
        }
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.containerFragmentos, fragmento)
                .commit();
    }

    public void irParaLogin() {
        Intent intencao = new Intent(this, TelaLogin.class);
        intencao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intencao);
        finish();
    }
}
