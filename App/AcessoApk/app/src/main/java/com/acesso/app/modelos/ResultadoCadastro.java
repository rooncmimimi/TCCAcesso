package com.acesso.app.modelos;

/**
 * Resultado do cadastro. Se a confirmação de e-mail estiver ligada no servidor, a conta é criada
 * mas ainda não há sessão (sessao == null) e, na API do Site, o e-mail a confirmar vem junto.
 */
public class ResultadoCadastro {

    private final SessaoUsuario sessao;
    private final String email;

    public ResultadoCadastro(SessaoUsuario sessao) {
        this(sessao, null);
    }

    private ResultadoCadastro(SessaoUsuario sessao, String email) {
        this.sessao = sessao;
        this.email = email;
    }

    /** Conta criada sem sessão: falta confirmar o e-mail (email pode ser null se a fonte não informar). */
    public static ResultadoCadastro pendenteDeConfirmacao(String email) {
        return new ResultadoCadastro(null, email);
    }

    public SessaoUsuario getSessao() {
        return sessao;
    }

    /** E-mail a confirmar; só existe quando {@link #precisaConfirmarEmail()} e a fonte o informa. */
    public String getEmail() {
        return email;
    }

    public boolean precisaConfirmarEmail() {
        return sessao == null;
    }
}
