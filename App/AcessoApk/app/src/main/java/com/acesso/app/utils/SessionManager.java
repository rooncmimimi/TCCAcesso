package com.acesso.app.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.acesso.app.models.AuthSession;

/**
 * Guarda a sessão no aparelho para o usuário não precisar entrar toda vez.
 * A senha nunca é salva: só os tokens que o Supabase devolve.
 */
public class SessionManager {

    private static final String PREFS_NAME = "acesso_session";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_EXPIRES_AT = "expires_at";

    private final SharedPreferences prefs;

    public SessionManager(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public void save(AuthSession session) {
        prefs.edit()
                .putString(KEY_USER_ID, session.getUserId())
                .putString(KEY_EMAIL, session.getEmail())
                .putString(KEY_ACCESS_TOKEN, session.getAccessToken())
                .putString(KEY_REFRESH_TOKEN, session.getRefreshToken())
                .putLong(KEY_EXPIRES_AT, session.getExpiresAtMillis())
                .apply();
    }

    /** Devolve a sessão salva, ou null se ninguém estiver logado. */
    public AuthSession get() {
        String accessToken = prefs.getString(KEY_ACCESS_TOKEN, null);
        String refreshToken = prefs.getString(KEY_REFRESH_TOKEN, null);
        if (accessToken == null || refreshToken == null) {
            return null;
        }
        return new AuthSession(
                prefs.getString(KEY_USER_ID, null),
                prefs.getString(KEY_EMAIL, null),
                accessToken,
                refreshToken,
                prefs.getLong(KEY_EXPIRES_AT, 0));
    }

    public void clear() {
        prefs.edit().clear().apply();
    }
}
