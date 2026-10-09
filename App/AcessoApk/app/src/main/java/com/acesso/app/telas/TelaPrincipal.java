package com.acesso.app.telas;

import android.os.Bundle;
import android.view.View;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaPrincipalBinding;
import com.acesso.app.fragmentos.FragmentoCriar;
import com.acesso.app.fragmentos.FragmentoInicio;
import com.acesso.app.fragmentos.FragmentoOportunidades;
import com.acesso.app.fragmentos.FragmentoPerfil;
import com.acesso.app.fragmentos.FragmentoPesquisa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.Navegacao;
import com.acesso.app.viewmodels.ViewModelSessao;

/**
 * Área logada (pessoa ou empresa aprovada), com a barra de abas embaixo.
 * Só abre com sessão: sem ela, ou com a sessão encerrada, volta para a apresentação.
 * Para empresa, a aba Oportunidades vira "Painel" (como /dashboard/empresa no site).
 */
public class TelaPrincipal extends AppCompatActivity {

    private TelaPrincipalBinding componentes;
    private ViewModelSessao viewModelSessao;
    /** Pedido feito por outra aba ("Publicar nova vaga"): abrir a aba Criar já no formulário de vaga. */
    private boolean abrirCriacaoDeVaga;

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
        if (destino == Navegacao.Destino.EMPRESA_EM_ANALISE) {
            Navegacao.abrirAreaAutenticada(this, sessao);
            return;
        }

        componentes = TelaPrincipalBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        // Com o teclado aberto a barra de abas some, para sobrar espaço ao campo e ao botão de enviar.
        MargensSistema.aplicar(this, componentes.raiz, tecladoAberto ->
                componentes.navegacaoInferior.setVisibility(tecladoAberto ? View.GONE : View.VISIBLE));

        componentes.avisoDemonstracao.getRoot().setVisibility(
                FabricaRepositorios.modoDemonstracao() ? View.VISIBLE : View.GONE);
        // Versão curta: o aviso fica em todas as abas e não deve tomar o espaço do conteúdo.
        componentes.avisoDemonstracao.getRoot().setText(R.string.aviso_modo_demonstracao_curto);
        if (sessao.ehEmpresa()) {
            componentes.navegacaoInferior.getMenu().findItem(R.id.aba_oportunidades).setTitle(R.string.aba_painel);
        }

        componentes.navegacaoInferior.setOnItemSelectedListener(item -> {
            mostrarAba(item.getItemId());
            return true;
        });
        // Tocar de novo na aba atual não recarrega nada.
        componentes.navegacaoInferior.setOnItemReselectedListener(item -> { });

        // Voltar numa aba que não é a Início leva à Início; na Início, sai do app.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (componentes.navegacaoInferior.getSelectedItemId() != R.id.aba_inicio) {
                    componentes.navegacaoInferior.setSelectedItemId(R.id.aba_inicio);
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        viewModelSessao.getSessaoEncerrada().observe(this, aviso ->
                Navegacao.voltarParaApresentacao(this, aviso == null || aviso.isEmpty() ? null : aviso));
        viewModelSessao.getSessao().observe(this, atualizada -> {
            // A renovação pode trazer outro status de empresa (ex.: suspensa).
            if (Navegacao.destinoPara(atualizada) == Navegacao.Destino.EMPRESA_EM_ANALISE) {
                Navegacao.abrirAreaAutenticada(this, atualizada);
            }
        });
        viewModelSessao.verificar();

        // A Início já vem marcada; setSelectedItemId nela contaria como "tocar de novo" e não
        // abriria nada. Por isso o primeiro fragmento é mostrado direto.
        if (estadoSalvo == null) {
            mostrarAba(R.id.aba_inicio);
        }
    }

    /** Chamado por Início ("Escrever publicação") e pelo Painel ("Publicar nova vaga"). */
    public void abrirCriacao(boolean vaga) {
        abrirCriacaoDeVaga = vaga;
        if (componentes.navegacaoInferior.getSelectedItemId() == R.id.aba_criar) {
            mostrarAba(R.id.aba_criar);
        } else {
            componentes.navegacaoInferior.setSelectedItemId(R.id.aba_criar);
        }
    }

    private void mostrarAba(int idAba) {
        Fragment fragmento;
        if (idAba == R.id.aba_oportunidades) {
            fragmento = new FragmentoOportunidades();
        } else if (idAba == R.id.aba_criar) {
            fragmento = FragmentoCriar.novaInstancia(abrirCriacaoDeVaga);
            abrirCriacaoDeVaga = false;
        } else if (idAba == R.id.aba_pesquisa) {
            fragmento = new FragmentoPesquisa();
        } else if (idAba == R.id.aba_perfil) {
            fragmento = new FragmentoPerfil();
        } else {
            fragmento = new FragmentoInicio();
        }
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.containerFragmentos, fragmento)
                .commit();
    }
}
