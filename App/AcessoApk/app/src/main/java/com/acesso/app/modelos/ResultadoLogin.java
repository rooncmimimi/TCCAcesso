package com.acesso.app.modelos;

/**
 * Resultado de uma tentativa de login com e-mail e senha corretos.
 * Como na API do Site, a conta pode existir e mesmo assim não receber sessão:
 * e-mail ainda não confirmado ou conta pausada pelo próprio usuário.
 * Senha errada não chega aqui: vira falha (RetornoRepositorio.aoFalhar).
 */
public class ResultadoLogin {

    public enum Situacao { AUTENTICADO, EMAIL_NAO_CONFIRMADO, CONTA_PAUSADA }

    private final Situacao situacao;
    private final SessaoUsuario sessao;
    private final String email;

    private ResultadoLogin(Situacao situacao, SessaoUsuario sessao, String email) {
        this.situacao = situacao;
        this.sessao = sessao;
        this.email = email;
    }

    public static ResultadoLogin autenticado(SessaoUsuario sessao) {
        return new ResultadoLogin(Situacao.AUTENTICADO, sessao, sessao.getEmail());
    }

    public static ResultadoLogin emailNaoConfirmado(String email) {
        return new ResultadoLogin(Situacao.EMAIL_NAO_CONFIRMADO, null, email);
    }

    public static ResultadoLogin contaPausada() {
        return new ResultadoLogin(Situacao.CONTA_PAUSADA, null, null);
    }

    public Situacao getSituacao() {
        return situacao;
    }

    /** Só existe quando a situação é AUTENTICADO. */
    public SessaoUsuario getSessao() {
        return sessao;
    }

    public String getEmail() {
        return email;
    }
}
