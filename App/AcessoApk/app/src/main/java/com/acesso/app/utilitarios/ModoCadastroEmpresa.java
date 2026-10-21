package com.acesso.app.utilitarios;

import com.acesso.app.modelos.SessaoUsuario;

/**
 * Como o cadastro de empresa se comporta agora. Na API do Site (AutenticacaoService.cadastrarEmpresa)
 * a conta de empresa nasce de uma conta de candidato: sem sessão de candidato a API responde 401, e o
 * vínculo vem da sessão, nunca do corpo da requisição. O Site mostra, nesse caso, uma explicação antes
 * do formulário; o app faz o mesmo para a pessoa não preencher tudo antes de descobrir.
 * Não depende do Android (testado em ModoCadastroEmpresaTeste).
 */
public enum ModoCadastroEmpresa {

    /** A fonte de login não tem essa regra (Supabase): o formulário abre direto, sem vínculo. */
    LIVRE,

    /** Sem conta de candidato logada: mostra a explicação e leva ao cadastro de pessoa. */
    PRECISA_CONTA_DE_PESSOA,

    /** Logado como candidato: o formulário abre e é enviado em nome dessa conta. */
    COM_CONTA_DE_PESSOA;

    public static ModoCadastroEmpresa de(boolean fonteExigeContaDePessoa, SessaoUsuario sessao) {
        if (!fonteExigeContaDePessoa) {
            return LIVRE;
        }
        return sessao != null && !sessao.ehEmpresa() ? COM_CONTA_DE_PESSOA : PRECISA_CONTA_DE_PESSOA;
    }
}
