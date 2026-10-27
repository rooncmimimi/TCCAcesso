package com.acesso.app.modelos;

/**
 * Tipo de conta, como no Site: pessoa candidata ou empresa.
 * O código é o mesmo valor que a API do Site usa em "tipoUsuario".
 */
public enum TipoConta {
    PESSOA("candidato"),
    EMPRESA("empresa");

    private final String codigo;

    TipoConta(String codigo) {
        this.codigo = codigo;
    }

    public String getCodigo() {
        return codigo;
    }

    /** Converte o valor salvo ou vindo da API. Devolve null para tipos que o app não atende (ex.: administrador). */
    public static TipoConta doCodigo(String codigo) {
        for (TipoConta tipo : values()) {
            if (tipo.codigo.equals(codigo)) {
                return tipo;
            }
        }
        return null;
    }
}
