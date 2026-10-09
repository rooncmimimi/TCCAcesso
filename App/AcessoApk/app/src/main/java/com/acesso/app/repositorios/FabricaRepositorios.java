package com.acesso.app.repositorios;

import android.content.Context;

import com.acesso.app.BuildConfig;

/**
 * Escolhe as implementações usadas pelo app conforme FONTE_AUTENTICACAO
 * (local.properties ou -PFONTE_AUTENTICACAO=...). É o único lugar que
 * conhece as classes concretas; o resto do app usa só as interfaces.
 */
public final class FabricaRepositorios {

    private static final String FONTE_SUPABASE = "supabase";
    private static final String FONTE_API = "api";
    private static final String FONTE_SIMULADA = "simulada";

    private FabricaRepositorios() {
    }

    public static RepositorioAutenticacao autenticacao(Context contexto) {
        switch (fonteAtiva()) {
            case FONTE_API:
                return new RepositorioAutenticacaoApi(contexto);
            case FONTE_SIMULADA:
                return new RepositorioAutenticacaoSimulado();
            default:
                return new RepositorioAutenticacaoSupabase(contexto);
        }
    }

    public static RepositorioConteudo conteudo() {
        return modoDemonstracao() ? new RepositorioConteudoSimulado() : new RepositorioConteudoPendente();
    }

    /** true quando as respostas são simuladas: as telas mostram o aviso "Modo demonstração". */
    public static boolean modoDemonstracao() {
        return FONTE_SIMULADA.equals(fonteAtiva());
    }

    /** Origem gravada nas sessões criadas pela fonte ativa (ver SessaoUsuario.getOrigem). */
    public static String origemAtiva() {
        return fonteAtiva();
    }

    /** A simulação nunca vai para o build de release: lá, cai no Supabase. */
    private static String fonteAtiva() {
        String fonte = BuildConfig.FONTE_AUTENTICACAO;
        if (FONTE_SIMULADA.equals(fonte) && !BuildConfig.DEBUG) {
            return FONTE_SUPABASE;
        }
        return fonte;
    }
}
