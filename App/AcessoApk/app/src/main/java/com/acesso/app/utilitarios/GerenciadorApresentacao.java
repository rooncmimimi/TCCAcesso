package com.acesso.app.utilitarios;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Lembra se a tela de apresentação já foi vista, para ela aparecer só na
 * primeira vez que o app é aberto. Fica num arquivo separado da sessão para
 * não voltar a aparecer quando o usuário sai da conta.
 * Para ver de novo: limpar os dados do app (Configurações > Apps > ACESSO).
 */
public class GerenciadorApresentacao {

    private static final String NOME_PREFERENCIAS = "acesso_apresentacao";
    private static final String CHAVE_CONCLUIDA = "apresentacao_concluida";

    private final SharedPreferences preferencias;

    public GerenciadorApresentacao(Context contexto) {
        preferencias = contexto.getApplicationContext().getSharedPreferences(NOME_PREFERENCIAS, Context.MODE_PRIVATE);
    }

    public boolean foiConcluida() {
        return preferencias.getBoolean(CHAVE_CONCLUIDA, false);
    }

    public void marcarComoConcluida() {
        preferencias.edit().putBoolean(CHAVE_CONCLUIDA, true).apply();
    }
}
