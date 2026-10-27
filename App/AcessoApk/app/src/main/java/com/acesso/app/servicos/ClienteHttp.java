package com.acesso.app.servicos;

import android.util.Log;

import com.acesso.app.BuildConfig;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/** Um único cliente HTTP para o app inteiro (Supabase e API do Site), com os mesmos tempos limite. */
public final class ClienteHttp {

    public static final MediaType TIPO_JSON = MediaType.get("application/json; charset=utf-8");

    private static final OkHttpClient CLIENTE = montar();

    private static OkHttpClient montar() {
        OkHttpClient.Builder construtor = new OkHttpClient.Builder()
                // A API no plano grátis do Render dorme quando fica parada e a primeira resposta leva cerca
                // de 30 s ("partida a frio"): com 20 s o primeiro login falhava por tempo esgotado.
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS);
        if (BuildConfig.DEBUG) {
            // Só no build de debug: registra "MÉTODO /caminho -> status" para diagnosticar a conexão.
            // Nunca registra cabeçalhos (token), corpo (senha) nem a query string.
            construtor.addInterceptor(chain -> {
                Request requisicao = chain.request();
                String alvo = requisicao.method() + " " + requisicao.url().encodedPath();
                try {
                    Response resposta = chain.proceed(requisicao);
                    Log.d("AcessoHttp", alvo + " -> " + resposta.code());
                    return resposta;
                } catch (IOException erro) {
                    Log.d("AcessoHttp", alvo + " -> falhou (" + erro.getClass().getSimpleName() + ")");
                    throw erro;
                }
            });
        }
        return construtor.build();
    }

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
