package com.acesso.app.services;

import com.acesso.app.BuildConfig;
import com.google.gson.Gson;

import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;

/**
 * Ponto único de configuração da conexão com o Supabase.
 * O app usa apenas a chave "anon" (pública); o que cada usuário pode ver
 * ou alterar é controlado pelas políticas RLS no banco.
 */
public final class SupabaseClient {

    public static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private static final OkHttpClient HTTP_CLIENT = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .build();

    private static final Gson GSON = new Gson();

    private SupabaseClient() {
    }

    public static OkHttpClient http() {
        return HTTP_CLIENT;
    }

    public static Gson gson() {
        return GSON;
    }

    public static boolean isConfigured() {
        return !BuildConfig.SUPABASE_URL.isEmpty() && !BuildConfig.SUPABASE_ANON_KEY.isEmpty();
    }

    /** Endereço da API de autenticação, ex.: https://xyz.supabase.co/auth/v1/token */
    public static String authUrl(String path) {
        return BuildConfig.SUPABASE_URL + "/auth/v1/" + path;
    }

    /** Requisição já com a chave pública do projeto. */
    public static Request.Builder request(String url) {
        return new Request.Builder()
                .url(url)
                .header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                .header("Content-Type", "application/json");
    }

    /** Requisição feita em nome do usuário logado (o RLS usa esse token). */
    public static Request.Builder authenticatedRequest(String url, String accessToken) {
        return request(url).header("Authorization", "Bearer " + accessToken);
    }
}
