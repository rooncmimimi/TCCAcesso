package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.ResultadoLogin;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Leitura das respostas da API do Site (formatos de AutenticacaoService.montarSessao,
 * entrar e finalizarCadastro). Os JSON abaixo são exemplos com dados fictícios.
 */
public class RepositorioAutenticacaoApiTeste {

    /** JWT de mentira, só com a carga; o app não confere assinatura (isso é papel da API). */
    private static String jwtExpirandoEm(long segundos) {
        String carga = "{\"id\":\"u1\",\"tipoUsuario\":\"candidato\",\"exp\":" + segundos + "}";
        Base64.Encoder codificador = Base64.getUrlEncoder().withoutPadding();
        return codificador.encodeToString("{\"alg\":\"HS256\"}".getBytes(StandardCharsets.UTF_8)) + "."
                + codificador.encodeToString(carga.getBytes(StandardCharsets.UTF_8)) + ".assinatura";
    }

    private static JsonObject json(String texto) {
        return JsonParser.parseString(texto).getAsJsonObject();
    }

    @Test
    public void loginDePessoa() {
        String token = jwtExpirandoEm(2_000_000_000L);
        ResultadoLogin resultado = RepositorioAutenticacaoApi.lerResultadoLogin(json(
                "{\"sucesso\":true,\"usuario\":{\"id\":\"u1\",\"nome\":\"Joana Exemplo\",\"email\":\"joana@acesso.test\","
                        + "\"tipoUsuario\":\"candidato\"},\"token\":\"" + token + "\",\"refreshToken\":\"r1\"}"));

        assertEquals(ResultadoLogin.Situacao.AUTENTICADO, resultado.getSituacao());
        SessaoUsuario sessao = resultado.getSessao();
        assertEquals(TipoConta.PESSOA, sessao.getTipoConta());
        assertEquals("Joana Exemplo", sessao.getNome());
        assertEquals("r1", sessao.getTokenRenovacao());
        assertEquals(2_000_000_000_000L, sessao.getExpiraEmMillis());
        assertEquals(RepositorioAutenticacaoApi.ORIGEM, sessao.getOrigem());
        assertNull(sessao.getStatusEmpresa());
    }

    @Test
    public void loginDeEmpresaTrazStatusDeAprovacao() {
        ResultadoLogin resultado = RepositorioAutenticacaoApi.lerResultadoLogin(json(
                "{\"usuario\":{\"id\":\"u2\",\"nome\":\"Resp\",\"email\":\"e@acesso.test\",\"tipoUsuario\":\"empresa\","
                        + "\"empresa\":{\"statusAprovacao\":\"pendente\"}},\"token\":\"x\",\"refreshToken\":\"r\"}"));

        SessaoUsuario sessao = resultado.getSessao();
        assertTrue(sessao.ehEmpresa());
        assertEquals("pendente", sessao.getStatusEmpresa());
        assertTrue(sessao.empresaAguardandoAprovacao());
    }

    @Test
    public void emailNaoVerificadoEContaPausadaNaoGeramSessao() {
        ResultadoLogin naoVerificado = RepositorioAutenticacaoApi.lerResultadoLogin(
                json("{\"sucesso\":true,\"emailNaoVerificado\":true,\"email\":\"joana@acesso.test\"}"));
        assertEquals(ResultadoLogin.Situacao.EMAIL_NAO_CONFIRMADO, naoVerificado.getSituacao());
        assertNull(naoVerificado.getSessao());
        assertEquals("joana@acesso.test", naoVerificado.getEmail());

        ResultadoLogin pausada = RepositorioAutenticacaoApi.lerResultadoLogin(json("{\"sucesso\":true,\"contaPausada\":true}"));
        assertEquals(ResultadoLogin.Situacao.CONTA_PAUSADA, pausada.getSituacao());
        assertNull(pausada.getSessao());
    }

    @Test(expected = ExecutorHttp.ErroAmigavel.class)
    public void contaDeAdministradorNaoEntraNoApp() {
        RepositorioAutenticacaoApi.lerResultadoLogin(json(
                "{\"usuario\":{\"id\":\"a\",\"tipoUsuario\":\"administrador\"},\"token\":\"x\",\"refreshToken\":\"r\"}"));
    }

    @Test
    public void cadastroComConfirmacaoDeEmailPendente() {
        ResultadoCadastro resultado = RepositorioAutenticacaoApi.lerResultadoCadastro(
                json("{\"sucesso\":true,\"pendenteVerificacaoEmail\":true,\"email\":\"joana@acesso.test\"}"));
        assertTrue(resultado.precisaConfirmarEmail());
    }

    @Test
    public void cadastroSemConfirmacaoJaEntra() {
        ResultadoCadastro resultado = RepositorioAutenticacaoApi.lerResultadoCadastro(json(
                "{\"usuario\":{\"id\":\"u1\",\"tipoUsuario\":\"candidato\"},\"token\":\"x\",\"refreshToken\":\"r\"}"));
        assertFalse(resultado.precisaConfirmarEmail());
    }

    /** A resposta do /auth/refresh não traz a empresa: o status anterior é mantido. */
    @Test
    public void renovacaoMantemStatusDaEmpresa() {
        SessaoUsuario sessao = RepositorioAutenticacaoApi.lerSessao(json(
                "{\"usuario\":{\"id\":\"u2\",\"tipoUsuario\":\"empresa\"},\"token\":\"x\",\"refreshToken\":\"r2\"}"), "aprovada");
        assertEquals("aprovada", sessao.getStatusEmpresa());
    }

    @Test
    public void expiracaoDoJwt() {
        assertEquals(1_700_000_000_000L, RepositorioAutenticacaoApi.lerExpiracaoJwt(jwtExpirandoEm(1_700_000_000L), 0));
    }

    @Test
    public void tokenEmFormatoInesperadoUsaValidadePadrao() {
        long agora = 1_000_000L;
        long expira = RepositorioAutenticacaoApi.lerExpiracaoJwt("nao-e-um-jwt", agora);
        assertTrue(expira > agora);
    }
}
