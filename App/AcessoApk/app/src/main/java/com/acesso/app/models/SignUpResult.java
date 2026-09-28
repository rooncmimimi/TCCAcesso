package com.acesso.app.models;

/**
 * Resultado do cadastro. Se a confirmação de e-mail estiver ligada no Supabase,
 * a conta é criada mas ainda não há sessão (session == null).
 */
public class SignUpResult {

    private final AuthSession session;

    public SignUpResult(AuthSession session) {
        this.session = session;
    }

    public AuthSession getSession() {
        return session;
    }

    public boolean needsEmailConfirmation() {
        return session == null;
    }
}
