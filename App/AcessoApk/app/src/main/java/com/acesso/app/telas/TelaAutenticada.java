package com.acesso.app.telas;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.RenovadorSessao;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Navegacao;

/**
 * Base das telas abertas por cima da área logada (vaga, perfil, mensagens, pesquisa, candidaturas).
 *
 * Mesma regra da TelaPrincipal: sem sessão, ou sem acesso liberado (empresa em análise), volta para o
 * lugar certo; e se uma requisição descobrir que a sessão acabou de vez (recusada, conta bloqueada, senha
 * alterada), leva à apresentação com o aviso. A renovação do token em si é feita pelo ExecutorHttp a
 * cada chamada; aqui nada mantém uma sessão inválida.
 */
public abstract class TelaAutenticada extends AppCompatActivity {

    private final RenovadorSessao.Ouvinte aoEncerrarSessao = aviso ->
            Navegacao.voltarParaApresentacao(this, aviso == null || aviso.isEmpty() ? null : aviso);
    private RenovadorSessao renovador;

    /** A sessão ao abrir a tela; nunca nula depois de {@link #sessaoValida()} devolver true. */
    protected SessaoUsuario sessao;

    /**
     * Chame no começo do onCreate (depois de super.onCreate). Devolve false quando a tela já foi
     * fechada para levar a pessoa a outro lugar; nesse caso, não monte a tela.
     */
    protected boolean sessaoValida() {
        sessao = new GerenciadorSessao(this).obter();
        Navegacao.Destino destino = Navegacao.destinoPara(sessao);
        if (destino == Navegacao.Destino.APRESENTACAO) {
            Navegacao.voltarParaApresentacao(this, null);
            return false;
        }
        if (destino == Navegacao.Destino.EMPRESA_EM_ANALISE) {
            Navegacao.abrirAreaAutenticada(this, sessao);
            return false;
        }
        return true;
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        renovador = RenovadorSessao.global(this);
    }

    @Override
    protected void onStart() {
        super.onStart();
        renovador.adicionarOuvinte(aoEncerrarSessao);
        // Voltou de segundo plano depois de sair da conta em outra tela: não mostra dados de quem saiu.
        if (!isFinishing() && new GerenciadorSessao(this).obter() == null) {
            Navegacao.voltarParaApresentacao(this, null);
        }
    }

    @Override
    protected void onStop() {
        renovador.removerOuvinte(aoEncerrarSessao);
        super.onStop();
    }
}
