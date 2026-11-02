package com.acesso.app.servicos;

import com.acesso.app.BuildConfig;

import okhttp3.Request;

/**
 * Ponto único de configuração da conexão com o Supabase.
 * O app usa apenas a chave anônima (pública); o que cada usuário pode ver
 * ou alterar é controlado pelas políticas RLS no banco.
 */
public final class ClienteSupabase {

    private ClienteSupabase() {
    }

    /** URL válida (com https://) e chave preenchidas no local.properties. */
    public static boolean estaConfigurado() {
        return ClienteHttp.enderecoValido(BuildConfig.URL_SUPABASE) && !BuildConfig.CHAVE_ANONIMA_SUPABASE.isEmpty();
    }

    /** Endereço da API de autenticação, ex.: https://xyz.supabase.co/auth/v1/token */
    public static String urlAutenticacao(String caminho) {
        return BuildConfig.URL_SUPABASE + "/auth/v1/" + caminho;
    }

    /** Requisição já com a chave pública do projeto. */
    public static Request.Builder requisicao(String url) {
        return new Request.Builder()
                .url(url)
                .header("apikey", BuildConfig.CHAVE_ANONIMA_SUPABASE)
                .header("Content-Type", "application/json");
    }

    /** Requisição feita em nome do usuário logado (o RLS usa esse token). */
    public static Request.Builder requisicaoAutenticada(String url, String tokenAcesso) {
        return requisicao(url).header("Authorization", "Bearer " + tokenAcesso);
    }
}
