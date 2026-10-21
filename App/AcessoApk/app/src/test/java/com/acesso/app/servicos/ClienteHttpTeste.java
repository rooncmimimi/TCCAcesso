package com.acesso.app.servicos;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Endereços que o app aceita como configurados. Um endereço recusado aqui faz o login
 * mostrar "ainda não foi configurado" em vez de o OkHttp lançar IllegalArgumentException
 * (era o que fechava o app ao entrar com URL_SUPABASE vazia).
 */
public class ClienteHttpTeste {

    @Test
    public void aceitaEnderecosHttpEHttps() {
        assertTrue(ClienteHttp.enderecoValido("https://projeto.supabase.co"));
        assertTrue(ClienteHttp.enderecoValido("http://10.0.2.2:3000/api"));
    }

    @Test
    public void recusaEnderecoVazioOuSemProtocolo() {
        assertFalse(ClienteHttp.enderecoValido(null));
        assertFalse(ClienteHttp.enderecoValido(""));
        assertFalse(ClienteHttp.enderecoValido("   "));
        assertFalse(ClienteHttp.enderecoValido("projeto.supabase.co"));
        assertFalse(ClienteHttp.enderecoValido("/auth/v1/token"));
    }
}
