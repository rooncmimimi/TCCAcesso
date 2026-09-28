package com.acesso.app.models;

/** Sessão do usuário logado, devolvida pelo Supabase Auth. */
public class AuthSession {

    private final String userId;
    private final String email;
    private final String accessToken;
    private final String refreshToken;
    /** Momento em que o accessToken expira, em milissegundos desde 1970. */
    private final long expiresAtMillis;

    public AuthSession(String userId, String email, String accessToken, String refreshToken, long expiresAtMillis) {
        this.userId = userId;
        this.email = email;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAtMillis = expiresAtMillis;
    }

    public String getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public long getExpiresAtMillis() {
        return expiresAtMillis;
    }

    /** Considera expirada um minuto antes, para não usar um token no limite. */
    public boolean isExpired(long nowMillis) {
        return nowMillis >= expiresAtMillis - 60_000;
    }
}
