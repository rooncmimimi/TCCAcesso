package com.acesso.app.servicos;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Traduz as respostas de erro da API do Site. O formato é sempre o mesmo
 * (erroMiddleware.js e validacaoMiddleware.js do Site/Backend):
 * <pre>{ "sucesso": false, "mensagem": "...", "erros": [{ "campo": "email", "mensagem": "..." }] }</pre>
 * A API já devolve mensagens em português prontas para o usuário, então elas
 * são usadas como estão; só os casos sem mensagem útil ganham texto próprio.
 */
public final class TradutorErrosApi {

    private TradutorErrosApi() {
    }

    public static FalhaHttp traduzir(int codigoHttp, String corpoResposta) {
        String mensagem = null;
        Map<String, String> errosCampos = new LinkedHashMap<>();

        try {
            JsonObject json = JsonParser.parseString(corpoResposta).getAsJsonObject();
            mensagem = texto(json, "mensagem");
            if (json.has("erros") && json.get("erros").isJsonArray()) {
                for (JsonElement item : json.getAsJsonArray("erros")) {
                    if (!item.isJsonObject()) {
                        continue;
                    }
                    String campo = texto(item.getAsJsonObject(), "campo");
                    String mensagemCampo = texto(item.getAsJsonObject(), "mensagem");
                    // Fica a primeira mensagem de cada campo (a API pode mandar várias regras do mesmo campo).
                    if (campo != null && mensagemCampo != null && !errosCampos.containsKey(campo)) {
                        errosCampos.put(campo, mensagemCampo);
                    }
                }
            }
        } catch (RuntimeException ignorado) {
            // Corpo que não é JSON (ex.: página de erro de um proxy): cai no tratamento pelo código HTTP.
        }

        if (codigoHttp == 429) {
            return new FalhaHttp(MensagensErro.MUITAS_TENTATIVAS);
        }
        if (codigoHttp >= 500) {
            // Mensagens 5xx da API podem ser técnicas ("Erro ao consultar o banco de dados.").
            return new FalhaHttp(MensagensErro.SERVICO_INDISPONIVEL);
        }
        if (codigoHttp == 422 && !errosCampos.isEmpty()) {
            // "Erro de validação." sozinho não ajuda; os detalhes aparecem em cada campo.
            return new FalhaHttp("Confira os campos destacados.", errosCampos);
        }
        if (mensagem == null || mensagem.isEmpty()) {
            mensagem = codigoHttp == 401 ? MensagensErro.SESSAO_EXPIRADA : MensagensErro.ERRO_GENERICO;
        }
        return new FalhaHttp(mensagem, errosCampos);
    }

    private static String texto(JsonObject json, String chave) {
        return json.has(chave) && json.get(chave).isJsonPrimitive() ? json.get(chave).getAsString() : null;
    }
}
