package com.acesso.app.servicos;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class TradutorErrosSupabaseTeste {

    @Test
    public void credenciaisIncorretasNoFormatoNovo() {
        String corpo = "{\"code\":400,\"error_code\":\"invalid_credentials\",\"msg\":\"Invalid login credentials\"}";
        assertEquals("E-mail ou senha incorretos.", TradutorErrosSupabase.traduzir(400, corpo));
    }

    @Test
    public void credenciaisIncorretasNoFormatoAntigo() {
        String corpo = "{\"error\":\"invalid_grant\",\"error_description\":\"Invalid login credentials\"}";
        assertEquals("E-mail ou senha incorretos.", TradutorErrosSupabase.traduzir(400, corpo));
    }

    @Test
    public void emailNaoConfirmadoNoFormatoAntigo() {
        String corpo = "{\"error\":\"invalid_grant\",\"error_description\":\"Email not confirmed\"}";
        assertTrue(TradutorErrosSupabase.traduzir(400, corpo).startsWith("Confirme seu e-mail"));
    }

    @Test
    public void emailJaCadastrado() {
        String corpo = "{\"code\":422,\"error_code\":\"user_already_exists\",\"msg\":\"User already registered\"}";
        assertTrue(TradutorErrosSupabase.traduzir(422, corpo).startsWith("Este e-mail já está cadastrado"));
    }

    @Test
    public void servidorForaDoArComCorpoQueNaoEJson() {
        assertTrue(TradutorErrosSupabase.traduzir(503, "<html>Bad gateway</html>").startsWith("O serviço está indisponível"));
    }

    @Test
    public void muitasTentativas() {
        assertTrue(TradutorErrosSupabase.traduzir(429, "").startsWith("Muitas tentativas"));
    }

    @Test
    public void erroDesconhecidoViraMensagemGenerica() {
        assertEquals(TradutorErrosSupabase.ERRO_GENERICO, TradutorErrosSupabase.traduzir(400, "{\"error_code\":\"algo_novo\"}"));
    }
}
