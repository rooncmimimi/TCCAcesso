package com.acesso.app.servicos;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Respostas no formato do erroMiddleware.js e do validacaoMiddleware.js do Site/Backend. */
public class TradutorErrosApiTeste {

    @Test
    public void validacaoComErrosPorCampo() {
        String corpo = "{\"sucesso\":false,\"mensagem\":\"Erro de validação.\",\"erros\":["
                + "{\"campo\":\"cnpj\",\"mensagem\":\"Informe um CNPJ válido.\"},"
                + "{\"campo\":\"senha\",\"mensagem\":\"A senha deve ter entre 8 e 72 caracteres.\"},"
                + "{\"campo\":\"senha\",\"mensagem\":\"A senha deve conter ao menos um número.\"}]}";
        FalhaHttp falha = TradutorErrosApi.traduzir(422, corpo);

        assertEquals("Confira os campos destacados.", falha.getMensagem());
        assertEquals("Informe um CNPJ válido.", falha.getErrosCampos().get("cnpj"));
        // Fica só a primeira regra de cada campo.
        assertEquals("A senha deve ter entre 8 e 72 caracteres.", falha.getErrosCampos().get("senha"));
        assertEquals(2, falha.getErrosCampos().size());
    }

    @Test
    public void mensagemDeRegraDeNegocioVaiComoEsta() {
        String corpo = "{\"sucesso\":false,\"mensagem\":\"Este e-mail já está cadastrado.\"}";
        assertEquals("Este e-mail já está cadastrado.", TradutorErrosApi.traduzir(409, corpo).getMensagem());
    }

    @Test
    public void loginInvalido() {
        String corpo = "{\"sucesso\":false,\"mensagem\":\"E-mail ou senha inválidos.\"}";
        FalhaHttp falha = TradutorErrosApi.traduzir(401, corpo);
        assertEquals("E-mail ou senha inválidos.", falha.getMensagem());
        assertTrue(falha.getErrosCampos().isEmpty());
    }

    @Test
    public void naoAutorizadoSemMensagemViraSessaoExpirada() {
        assertEquals(MensagensErro.SESSAO_EXPIRADA, TradutorErrosApi.traduzir(401, "").getMensagem());
    }

    @Test
    public void erroDoServidorNaoMostraDetalheTecnico() {
        String corpo = "{\"sucesso\":false,\"mensagem\":\"Erro ao consultar o banco de dados.\"}";
        assertEquals(MensagensErro.SERVICO_INDISPONIVEL, TradutorErrosApi.traduzir(500, corpo).getMensagem());
    }

    @Test
    public void muitasTentativas() {
        assertEquals(MensagensErro.MUITAS_TENTATIVAS, TradutorErrosApi.traduzir(429, "{}").getMensagem());
    }

    @Test
    public void corpoQueNaoEJson() {
        assertEquals(MensagensErro.ERRO_GENERICO, TradutorErrosApi.traduzir(404, "<html>Not found</html>").getMensagem());
    }
}
