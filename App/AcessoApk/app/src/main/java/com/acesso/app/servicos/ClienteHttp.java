package com.acesso.app.servicos;

import java.util.concurrent.TimeUnit;

import okhttp3.HttpUrl;
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

    /**
     * true se o endereço é uma URL http(s) que o OkHttp aceita. Um endereço vazio ou
     * sem "https://" faria o OkHttp lançar IllegalArgumentException ao montar a requisição.
     */
    public static boolean enderecoValido(String endereco) {
        return endereco != null && HttpUrl.parse(endereco) != null;
    }
}
