package com.acesso.app.servicos;

import com.acesso.app.BuildConfig;

import okhttp3.Request;

/**
 * Ponto único de configuração da conexão com a API do Site (Site/Backend, Express).
 * A URL base vem de URL_API no local.properties (ex.: http://10.0.2.2:3000/api no emulador).
 * Nenhum segredo fica no app: só o token do próprio usuário, depois do login.
 */
public final class ClienteApi {

    private ClienteApi() {
    }

    /** URL_API preenchida com um endereço válido (com http:// ou https://). */
    public static boolean estaConfigurada() {
        return ClienteHttp.enderecoValido(BuildConfig.URL_API);
    }

    /** Ex.: url("auth/login") -> http://10.0.2.2:3000/api/auth/login */
    public static String url(String caminho) {
        String base = BuildConfig.URL_API.endsWith("/") ? BuildConfig.URL_API : BuildConfig.URL_API + "/";
        return base + caminho;
    }

    public static Request.Builder requisicao(String caminho) {
        return new Request.Builder()
                .url(url(caminho))
                .header("Accept", "application/json");
    }

    /** Requisição em nome do usuário logado: a API confere o token em autenticacaoMiddleware.js. */
    public static Request.Builder requisicaoAutenticada(String caminho, String tokenAcesso) {
        return requisicao(caminho).header("Authorization", "Bearer " + tokenAcesso);
    }
}
