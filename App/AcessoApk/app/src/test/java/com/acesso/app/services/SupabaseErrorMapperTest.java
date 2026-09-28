package com.acesso.app.services;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class SupabaseErrorMapperTest {

    @Test
    public void credenciaisIncorretasNoFormatoNovo() {
        String body = "{\"code\":400,\"error_code\":\"invalid_credentials\",\"msg\":\"Invalid login credentials\"}";
        assertEquals("E-mail ou senha incorretos.", SupabaseErrorMapper.fromHttpError(400, body));
    }

    @Test
    public void credenciaisIncorretasNoFormatoAntigo() {
        String body = "{\"error\":\"invalid_grant\",\"error_description\":\"Invalid login credentials\"}";
        assertEquals("E-mail ou senha incorretos.", SupabaseErrorMapper.fromHttpError(400, body));
    }

    @Test
    public void emailNaoConfirmadoNoFormatoAntigo() {
        String body = "{\"error\":\"invalid_grant\",\"error_description\":\"Email not confirmed\"}";
        assertEquals(true, SupabaseErrorMapper.fromHttpError(400, body).startsWith("Confirme seu e-mail"));
    }

    @Test
    public void emailJaCadastrado() {
        String body = "{\"code\":422,\"error_code\":\"user_already_exists\",\"msg\":\"User already registered\"}";
        assertEquals(true, SupabaseErrorMapper.fromHttpError(422, body).startsWith("Este e-mail já está cadastrado"));
    }

    @Test
    public void servidorForaDoArComCorpoQueNaoEJson() {
        assertEquals(true, SupabaseErrorMapper.fromHttpError(503, "<html>Bad gateway</html>").startsWith("O serviço está indisponível"));
    }

    @Test
    public void muitasTentativas() {
        assertEquals(true, SupabaseErrorMapper.fromHttpError(429, "").startsWith("Muitas tentativas"));
    }

    @Test
    public void erroDesconhecidoViraMensagemGenerica() {
        assertEquals(SupabaseErrorMapper.GENERIC, SupabaseErrorMapper.fromHttpError(400, "{\"error_code\":\"algo_novo\"}"));
    }
}
