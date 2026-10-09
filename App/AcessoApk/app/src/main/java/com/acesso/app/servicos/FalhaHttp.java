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

    public FalhaHttp(String mensagem, Map<String, String> errosCampos) {
        this.mensagem = mensagem;
        this.errosCampos = errosCampos != null ? errosCampos : Collections.emptyMap();
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
}
