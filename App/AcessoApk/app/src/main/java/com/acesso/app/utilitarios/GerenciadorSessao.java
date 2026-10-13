package com.acesso.app.utilitarios;

import android.content.Context;
import android.content.SharedPreferences;

import com.acesso.app.modelos.SessaoUsuario;

/**
 * Guarda a sessão no aparelho para o usuário não precisar entrar toda vez.
 * A senha nunca é salva: só os tokens que o Supabase devolve.
 */
public class GerenciadorSessao {

    private static final String NOME_PREFERENCIAS = "acesso_sessao";
    private static final String CHAVE_ID_USUARIO = "id_usuario";
    private static final String CHAVE_EMAIL = "email";
    private static final String CHAVE_TOKEN_ACESSO = "token_acesso";
    private static final String CHAVE_TOKEN_RENOVACAO = "token_renovacao";
    private static final String CHAVE_EXPIRA_EM = "expira_em";

    private final SharedPreferences preferencias;

    public GerenciadorSessao(Context contexto) {
        preferencias = contexto.getApplicationContext().getSharedPreferences(NOME_PREFERENCIAS, Context.MODE_PRIVATE);
    }

    public void salvar(SessaoUsuario sessao) {
        preferencias.edit()
                .putString(CHAVE_ID_USUARIO, sessao.getIdUsuario())
                .putString(CHAVE_EMAIL, sessao.getEmail())
                .putString(CHAVE_TOKEN_ACESSO, sessao.getTokenAcesso())
                .putString(CHAVE_TOKEN_RENOVACAO, sessao.getTokenRenovacao())
                .putLong(CHAVE_EXPIRA_EM, sessao.getExpiraEmMillis())
                .apply();
    }

    /** Devolve a sessão salva, ou null se ninguém estiver logado. */
    public SessaoUsuario obter() {
        String tokenAcesso = preferencias.getString(CHAVE_TOKEN_ACESSO, null);
        String tokenRenovacao = preferencias.getString(CHAVE_TOKEN_RENOVACAO, null);
        if (tokenAcesso == null || tokenRenovacao == null) {
            return null;
        }
        return new SessaoUsuario(
                preferencias.getString(CHAVE_ID_USUARIO, null),
                preferencias.getString(CHAVE_EMAIL, null),
                tokenAcesso,
                tokenRenovacao,
                preferencias.getLong(CHAVE_EXPIRA_EM, 0));
    }

    public void limpar() {
        preferencias.edit().clear().apply();
    }
}
