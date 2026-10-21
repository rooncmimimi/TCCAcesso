package com.acesso.app.repositorios;

import com.acesso.app.servicos.ClienteHttp;
import com.google.gson.JsonObject;

import okhttp3.HttpUrl;
import okhttp3.Request;
import okhttp3.RequestBody;

/**
 * Monta as requisições autenticadas à API do Site (Accept JSON + Authorization: Bearer). Usado pelos
 * repositórios de conteúdo, mensagens e notificações, para todos falarem com a API do mesmo jeito.
 */
final class MontadorRequisicao {

    private final String urlBase;

    /** @param urlBase termina em "/", ex.: http://10.0.2.2:3000/api/ */
    MontadorRequisicao(String urlBase) {
        this.urlBase = urlBase;
    }

    /** {@code parametros} são pares chave, valor; valores nulos ou vazios ficam de fora. */
    Request get(String caminho, String token, String... parametros) {
        return construir(caminho, token, parametros).get().build();
    }

    Request post(String caminho, String token, JsonObject corpo) {
        return construir(caminho, token).post(json(corpo)).build();
    }

    /** PATCH sem corpo (ex.: marcar como lida): a API não lê nada além da rota. */
    Request patch(String caminho, String token) {
        return construir(caminho, token).patch(json(new JsonObject())).build();
    }

    private static RequestBody json(JsonObject corpo) {
        return RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON);
    }

    private Request.Builder construir(String caminho, String token, String... parametros) {
        HttpUrl.Builder url = HttpUrl.get(urlBase + caminho).newBuilder();
        for (int i = 0; i + 1 < parametros.length; i += 2) {
            String valor = parametros[i + 1];
            if (valor != null && !valor.trim().isEmpty()) {
                url.addQueryParameter(parametros[i], valor.trim());
            }
        }
        return new Request.Builder()
                .url(url.build())
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + token);
    }

    /**
     * Um identificador vai num segmento do caminho (ex.: vagas/{id}): só letras, números e hífen (UUID),
     * para nunca montar outra rota com "/" ou "..". Os repositórios conferem antes de enviar.
     */
    static boolean idValido(String id) {
        return id != null && !id.isEmpty() && id.matches("[A-Za-z0-9-]+");
    }
}
