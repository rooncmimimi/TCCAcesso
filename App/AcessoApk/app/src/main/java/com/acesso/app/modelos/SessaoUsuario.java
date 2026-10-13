package com.acesso.app.modelos;

/** Sessão do usuário logado, devolvida pelo Supabase Auth. */
public class SessaoUsuario {

    private final String idUsuario;
    private final String email;
    private final String tokenAcesso;
    private final String tokenRenovacao;
    /** Momento em que o tokenAcesso expira, em milissegundos desde 1970. */
    private final long expiraEmMillis;

    public SessaoUsuario(String idUsuario, String email, String tokenAcesso, String tokenRenovacao, long expiraEmMillis) {
        this.idUsuario = idUsuario;
        this.email = email;
        this.tokenAcesso = tokenAcesso;
        this.tokenRenovacao = tokenRenovacao;
        this.expiraEmMillis = expiraEmMillis;
    }

    public String getIdUsuario() {
        return idUsuario;
    }

    public String getEmail() {
        return email;
    }

    public String getTokenAcesso() {
        return tokenAcesso;
    }

    public String getTokenRenovacao() {
        return tokenRenovacao;
    }

    public long getExpiraEmMillis() {
        return expiraEmMillis;
    }

    /** Considera expirada um minuto antes, para não usar um token no limite. */
    public boolean estaExpirada(long agoraMillis) {
        return agoraMillis >= expiraEmMillis - 60_000;
    }
}
