package com.acesso.app.servicos;

import java.util.Collections;
import java.util.Map;

/**
 * Erro devolvido por um servidor, já traduzido: a mensagem geral e, quando o
 * servidor aponta campos específicos (ex.: a API do Site em "erros"), uma
 * mensagem por campo para mostrar ao lado de cada um.
 */
public class FalhaHttp {

    private final String mensagem;
    private final Map<String, String> errosCampos;
    private final int codigoHttp;
    private final String codigoErro;

    public FalhaHttp(String mensagem, Map<String, String> errosCampos, int codigoHttp, String codigoErro) {
        this.mensagem = mensagem;
        this.errosCampos = errosCampos != null ? errosCampos : Collections.emptyMap();
        this.codigoHttp = codigoHttp;
        this.codigoErro = codigoErro;
    }

    public FalhaHttp(String mensagem, Map<String, String> errosCampos) {
        this(mensagem, errosCampos, 0, null);
    }

    public FalhaHttp(String mensagem) {
        this(mensagem, null);
    }

    public String getMensagem() {
        return mensagem;
    }

    /** Campo (no nome usado pela API, ex.: "email", "cnpj") e a mensagem dele. */
    public Map<String, String> getErrosCampos() {
        return errosCampos;
    }

    /** Status HTTP da resposta, ou 0 quando a falha não veio de uma resposta (rede, configuração). */
    public int getCodigoHttp() {
        return codigoHttp;
    }

    /** Código de {@link CodigosErro} (ex.: CONTA_BLOQUEADA), ou null quando não há um específico. */
    public String getCodigoErro() {
        return codigoErro;
    }
}
