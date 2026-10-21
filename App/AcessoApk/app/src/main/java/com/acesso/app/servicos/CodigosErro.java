package com.acesso.app.servicos;

/**
 * Códigos que o app usa para distinguir por que uma sessão acabou. Os dois últimos vêm da API
 * em "detalhes.codigo" (autenticacaoMiddleware.js e SessaoService.js); SESSAO_EXPIRADA é do app.
 */
public final class CodigosErro {

    public static final String SESSAO_EXPIRADA = "SESSAO_EXPIRADA";
    public static final String CONTA_BLOQUEADA = "CONTA_BLOQUEADA";
    public static final String SENHA_ALTERADA = "SENHA_ALTERADA";

    private CodigosErro() {
    }

    /** true quando o código significa que a sessão não tem mais volta (renovar não adianta). */
    public static boolean encerraSessao(String codigo) {
        return SESSAO_EXPIRADA.equals(codigo) || CONTA_BLOQUEADA.equals(codigo) || SENHA_ALTERADA.equals(codigo);
    }
}
