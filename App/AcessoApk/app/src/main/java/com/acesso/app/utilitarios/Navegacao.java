package com.acesso.app.utilitarios;

import android.app.Activity;
import android.content.Intent;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.telas.TelaApresentacao;
import com.acesso.app.telas.TelaCadastro;
import com.acesso.app.telas.TelaLogin;
import com.acesso.app.telas.TelaPrincipal;
import com.acesso.app.telas.TelaStatusEmpresa;

/**
 * Para onde o app leva a pessoa conforme o estado de autenticação.
 *
 * Sem sessão: apresentação, login e cadastro. Com sessão: só a área autenticada,
 * aberta com FLAG_ACTIVITY_CLEAR_TASK para apagar a pilha de telas; assim o
 * botão Voltar não retorna à apresentação nem ao login depois de entrar.
 */
public final class Navegacao {

    public enum Destino { APRESENTACAO, AREA_PESSOA, AREA_EMPRESA, EMPRESA_EM_ANALISE }

    /** Aviso opcional mostrado na apresentação ao chegar lá (ex.: sessão expirada). */
    public static final String EXTRA_AVISO = "aviso";

    private Navegacao() {
    }

    /** Decide o destino sem depender do Android (testado em NavegacaoTeste). */
    public static Destino destinoPara(SessaoUsuario sessao) {
        if (sessao == null) {
            return Destino.APRESENTACAO;
        }
        if (sessao.empresaAguardandoAprovacao()) {
            return Destino.EMPRESA_EM_ANALISE;
        }
        return sessao.ehEmpresa() ? Destino.AREA_EMPRESA : Destino.AREA_PESSOA;
    }

    /** Depois do login/cadastro (ou ao abrir o app já logado): vai para a área da conta e limpa a pilha. */
    public static void abrirAreaAutenticada(Activity origem, SessaoUsuario sessao) {
        Class<?> tela = destinoPara(sessao) == Destino.EMPRESA_EM_ANALISE ? TelaStatusEmpresa.class : TelaPrincipal.class;
        Intent intencao = new Intent(origem, tela);
        intencao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        origem.startActivity(intencao);
        origem.finish();
    }

    /** Ao sair da conta ou perder a sessão: volta para a apresentação, sem nada da área logada na pilha. */
    public static void voltarParaApresentacao(Activity origem, String aviso) {
        Intent intencao = new Intent(origem, TelaApresentacao.class);
        intencao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        if (aviso != null) {
            intencao.putExtra(EXTRA_AVISO, aviso);
        }
        origem.startActivity(intencao);
        origem.finish();
    }

    /** Abre o login com a apresentação embaixo (Voltar no login leva à apresentação). */
    public static void abrirLoginDoZero(Activity origem) {
        Intent apresentacao = new Intent(origem, TelaApresentacao.class);
        apresentacao.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        origem.startActivities(new Intent[]{apresentacao, new Intent(origem, TelaLogin.class)});
        origem.finish();
    }

    /** Cadastro aberto por cima do login, para "Já tem conta? Entrar" e Voltar levarem ao login. */
    public static Intent[] loginECadastro(Activity origem, boolean empresa) {
        Intent cadastro = new Intent(origem, TelaCadastro.class);
        cadastro.putExtra(TelaCadastro.EXTRA_EMPRESA, empresa);
        return new Intent[]{new Intent(origem, TelaLogin.class), cadastro};
    }
}
