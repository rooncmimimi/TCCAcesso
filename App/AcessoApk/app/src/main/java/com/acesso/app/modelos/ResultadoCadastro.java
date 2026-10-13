package com.acesso.app.modelos;

/**
 * Resultado do cadastro. Se a confirmação de e-mail estiver ligada no Supabase,
 * a conta é criada mas ainda não há sessão (sessao == null).
 */
public class ResultadoCadastro {

    private final SessaoUsuario sessao;

    public ResultadoCadastro(SessaoUsuario sessao) {
        this.sessao = sessao;
    }

    public SessaoUsuario getSessao() {
        return sessao;
    }

    public boolean precisaConfirmarEmail() {
        return sessao == null;
    }
}
