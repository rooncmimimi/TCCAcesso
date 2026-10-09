package com.acesso.app.servicos;

import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;

/** Um único cliente HTTP para o app inteiro (Supabase e API do Site), com os mesmos tempos limite. */
public final class ClienteHttp {

    public static final MediaType TIPO_JSON = MediaType.get("application/json; charset=utf-8");

    private static final OkHttpClient CLIENTE = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .build();

    private ClienteHttp() {
    }

    public static OkHttpClient http() {
        return CLIENTE;
    }
}
