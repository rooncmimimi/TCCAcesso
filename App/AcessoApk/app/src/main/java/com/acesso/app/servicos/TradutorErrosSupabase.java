package com.acesso.app.servicos;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/**
 * Traduz as respostas de erro do Supabase em mensagens amigáveis em português.
 * O usuário nunca vê o texto técnico original nem stack traces.
 * Os códigos entre aspas (ex.: "invalid_credentials") são os que o próprio
 * Supabase devolve, por isso ficam em inglês.
 */
public final class TradutorErrosSupabase {

    public static final String SEM_INTERNET =
            "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    public static final String SERVIDOR_INACESSIVEL =
            "Não foi possível falar com o servidor. Tente novamente em instantes.";
    public static final String ERRO_GENERICO =
            "Algo deu errado. Tente novamente.";
    public static final String SESSAO_EXPIRADA =
            "Sua sessão expirou. Entre novamente.";

    private TradutorErrosSupabase() {
    }

    public static String traduzir(int codigoHttp, String corpoResposta) {
        String codigoErro = extrairCodigoErro(corpoResposta);

        switch (codigoErro) {
            case "invalid_credentials":
            case "invalid_grant":
                return "E-mail ou senha incorretos.";
            case "email_not_confirmed":
                return "Confirme seu e-mail antes de entrar. Procure a mensagem do ACESSO na sua caixa de entrada.";
            case "user_already_exists":
            case "email_exists":
                return "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.";
            case "weak_password":
                return "Essa senha é fraca. Use pelo menos 8 caracteres com letras e números.";
            case "email_address_invalid":
            case "validation_failed":
                return "Confira o e-mail digitado.";
            case "over_email_send_rate_limit":
            case "over_request_rate_limit":
                return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
            case "same_password":
                return "A nova senha precisa ser diferente da atual.";
            case "session_not_found":
            case "refresh_token_not_found":
            case "bad_jwt":
                return SESSAO_EXPIRADA;
            case "signup_disabled":
                return "O cadastro está temporariamente desativado.";
            default:
                break;
        }

        if (codigoHttp == 429) {
            return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
        }
        if (codigoHttp == 401 || codigoHttp == 403) {
            return SESSAO_EXPIRADA;
        }
        if (codigoHttp >= 500) {
            return "O serviço está indisponível no momento. Tente novamente mais tarde.";
        }
        return ERRO_GENERICO;
    }

    /**
     * O Supabase Auth usa formatos diferentes conforme a versão:
     * {"error_code": "..."} nas mais novas e {"error": "..."} nas mais antigas.
     */
    static String extrairCodigoErro(String corpoResposta) {
        if (corpoResposta == null || corpoResposta.isEmpty()) {
            return "";
        }
        try {
            JsonObject json = JsonParser.parseString(corpoResposta).getAsJsonObject();
            if (json.has("error_code") && !json.get("error_code").isJsonNull()) {
                return json.get("error_code").getAsString();
            }
            String mensagem = primeiroTexto(json, "msg", "message", "error_description");
            String mensagemMinuscula = mensagem != null ? mensagem.toLowerCase() : "";
            if (mensagemMinuscula.contains("email not confirmed")) {
                return "email_not_confirmed";
            }
            if (json.has("error") && json.get("error").isJsonPrimitive()) {
                return json.get("error").getAsString();
            }
            if (mensagemMinuscula.contains("invalid login credentials")) {
                return "invalid_credentials";
            }
            if (mensagemMinuscula.contains("already registered")) {
                return "user_already_exists";
            }
        } catch (RuntimeException ignorado) {
            // Corpo que não é JSON (ex.: página de erro de um proxy): cai no tratamento pelo código HTTP.
        }
        return "";
    }

    private static String primeiroTexto(JsonObject json, String... chaves) {
        for (String chave : chaves) {
            if (json.has(chave) && json.get(chave).isJsonPrimitive()) {
                return json.get(chave).getAsString();
            }
        }
        return null;
    }
}
