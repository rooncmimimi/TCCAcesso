package com.acesso.app.modelos;

/**
 * Sessão do usuário logado. É o que o app usa para saber se há alguém autenticado
 * e para qual área levar a pessoa (pessoa ou empresa).
 */
public class SessaoUsuario {

    /** Status da empresa que libera o app, como no Site (Empresa.statusAprovacao). */
    public static final String EMPRESA_APROVADA = "aprovada";

    private final String idUsuario;
    private final String email;
    private final String nome;
    private final TipoConta tipoConta;
    /** Só para empresa: pendente, aprovada, reprovada ou suspensa. null quando não se aplica ou não se sabe. */
    private final String statusEmpresa;
    private final String tokenAcesso;
    private final String tokenRenovacao;
    /** Momento em que o tokenAcesso expira, em milissegundos desde 1970. */
    private final long expiraEmMillis;
    /** De onde veio a sessão (supabase, api ou simulada), para nunca usar um token simulado num servidor real. */
    private final String origem;

    public SessaoUsuario(String idUsuario, String email, String nome, TipoConta tipoConta, String statusEmpresa,
                         String tokenAcesso, String tokenRenovacao, long expiraEmMillis, String origem) {
        this.idUsuario = idUsuario;
        this.email = email;
        this.nome = nome;
        this.tipoConta = tipoConta != null ? tipoConta : TipoConta.PESSOA;
        this.statusEmpresa = statusEmpresa;
        this.tokenAcesso = tokenAcesso;
        this.tokenRenovacao = tokenRenovacao;
        this.expiraEmMillis = expiraEmMillis;
        this.origem = origem;
    }

    public String getIdUsuario() {
        return idUsuario;
    }

    public String getEmail() {
        return email;
    }

    public String getNome() {
        return nome;
    }

    public TipoConta getTipoConta() {
        return tipoConta;
    }

    public String getStatusEmpresa() {
        return statusEmpresa;
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

    public String getOrigem() {
        return origem;
    }

    public boolean ehEmpresa() {
        return tipoConta == TipoConta.EMPRESA;
    }

    /**
     * Empresa ainda não liberada pela moderação (como a TelaStatusEmpresa do Site).
     * Status desconhecido (null) não bloqueia: a API recusa as rotas de empresa se preciso.
     */
    public boolean empresaAguardandoAprovacao() {
        return ehEmpresa() && statusEmpresa != null && !EMPRESA_APROVADA.equals(statusEmpresa);
    }

    /** Considera expirada um minuto antes, para não usar um token no limite. */
    public boolean estaExpirada(long agoraMillis) {
        return agoraMillis >= expiraEmMillis - 60_000;
    }
}
