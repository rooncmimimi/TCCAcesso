package com.acesso.app.services;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/**
 * Traduz as respostas de erro do Supabase em mensagens amigáveis em português.
 * O usuário nunca vê o texto técnico original nem stack traces.
 */
public final class SupabaseErrorMapper {

    public static final String NO_INTERNET =
            "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    public static final String SERVER_UNREACHABLE =
            "Não foi possível falar com o servidor. Tente novamente em instantes.";
    public static final String GENERIC =
            "Algo deu errado. Tente novamente.";

    private SupabaseErrorMapper() {
    }

    public static String fromHttpError(int statusCode, String responseBody) {
        String code = extractErrorCode(responseBody);

        switch (code) {
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
                return "Sua sessão expirou. Entre novamente.";
            case "signup_disabled":
                return "O cadastro está temporariamente desativado.";
            default:
                break;
        }

        if (statusCode == 429) {
            return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
        }
        if (statusCode == 401 || statusCode == 403) {
            return "Sua sessão expirou. Entre novamente.";
        }
        if (statusCode >= 500) {
            return "O serviço está indisponível no momento. Tente novamente mais tarde.";
        }
        return GENERIC;
    }

    /**
     * O Supabase Auth usa formatos diferentes conforme a versão:
     * {"error_code": "..."} nas mais novas e {"error": "..."} nas mais antigas.
     */
    static String extractErrorCode(String responseBody) {
        if (responseBody == null || responseBody.isEmpty()) {
            return "";
        }
        try {
            JsonObject json = JsonParser.parseString(responseBody).getAsJsonObject();
            if (json.has("error_code") && !json.get("error_code").isJsonNull()) {
                return json.get("error_code").getAsString();
            }
            String message = firstString(json, "msg", "message", "error_description");
            if (message != null && message.toLowerCase().contains("email not confirmed")) {
                return "email_not_confirmed";
            }
            if (json.has("error") && json.get("error").isJsonPrimitive()) {
                return json.get("error").getAsString();
            }
            if (message != null && message.toLowerCase().contains("invalid login credentials")) {
                return "invalid_credentials";
            }
            if (message != null && message.toLowerCase().contains("already registered")) {
                return "user_already_exists";
            }
        } catch (RuntimeException ignored) {
            // Corpo que não é JSON (ex.: página de erro de um proxy): cai no tratamento pelo status.
        }
        return "";
    }

    private static String firstString(JsonObject json, String... keys) {
        for (String key : keys) {
            if (json.has(key) && json.get(key).isJsonPrimitive()) {
                return json.get(key).getAsString();
            }
        }
        return null;
    }
}
