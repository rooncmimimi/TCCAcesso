package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.servicos.CodigosErro;
import com.acesso.app.servicos.MensagensErro;
import com.acesso.app.servicos.TradutorErrosApi;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;

/**
 * Requisição autenticada contra um servidor HTTP de mentira (JDK), no formato de erro da API:
 * renova o token vencido, repete depois de um 401 e encerra a sessão nos casos definitivos.
 */
public class ExecutorHttpSessaoTeste {

    private static final String CRLF = "" + (char) 13 + (char) 10;
    private static final long LONGE =System.currentTimeMillis() + 3_600_000;

    private ServerSocket servidor;
    private final List<String> autorizacoes = Collections.synchronizedList(new ArrayList<>());
    private volatile String tokenValido = "a2";
    private volatile int codigoParaToken = 401;
    private volatile String corpoParaToken = "{\"sucesso\":false,\"mensagem\":\"Token inválido ou expirado.\"}";

    /** Servidor HTTP mínimo (uma resposta por conexão), sem depender de nada além do JDK. */
    @Before
    public void iniciar() throws IOException {
        servidor = new ServerSocket(0, 50, java.net.InetAddress.getByName("127.0.0.1"));
        Thread atendimento = new Thread(() -> {
            while (!servidor.isClosed()) {
                try (Socket conexao = servidor.accept()) {
                    BufferedReader leitor = new BufferedReader(new InputStreamReader(conexao.getInputStream(), StandardCharsets.UTF_8));
                    String autorizacao = null;
                    String linha;
                    while ((linha = leitor.readLine()) != null && !linha.isEmpty()) {
                        if (linha.toLowerCase().startsWith("authorization:")) {
                            autorizacao = linha.substring(linha.indexOf(':') + 1).trim();
                        }
                    }
                    autorizacoes.add(autorizacao);
                    boolean valido = ("Bearer " + tokenValido).equals(autorizacao);
                    int codigo = valido ? 200 : codigoParaToken;
                    String corpo = valido ? "{\"sucesso\":true,\"valor\":\"ok\"}" : corpoParaToken;
                    byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
                    OutputStream saida = conexao.getOutputStream();
                    String cabecalho = "HTTP/1.1 " + codigo + " X" + CRLF
                            + "Content-Type: application/json" + CRLF
                            + "Content-Length: " + bytes.length + CRLF
                            + "Connection: close" + CRLF + CRLF;
                    saida.write(cabecalho.getBytes(StandardCharsets.UTF_8));
                    saida.write(bytes);
                    saida.flush();
                } catch (IOException encerrado) {
                    // servidor fechado no fim do teste
                }
            }
        });
        atendimento.setDaemon(true);
        atendimento.start();
    }

    @After
    public void parar() throws IOException {
        servidor.close();
    }

    private String url() {
        return "http://127.0.0.1:" + servidor.getLocalPort() + "/api/dado";
    }

    private ExecutorHttp executor(RenovadorSessao renovador) {
        return new ExecutorHttp(new OkHttpClient(), Runnable::run, () -> true, TradutorErrosApi::traduzir, renovador);
    }

    private static SessaoUsuario sessao(String acesso, String renovacao, long expiraEm) {
        return new SessaoUsuario("u1", "a@acesso.test", "Ana", TipoConta.PESSOA, null, acesso, renovacao, expiraEm, "api");
    }

    /** Servidor de renovação de mentira: conta os pedidos e devolve a próxima sessão. */
    private static class Renovacao implements RenovadorSessao.Acao {
        volatile int pedidos;
        volatile String falhaMensagem;

        @Override
        public void renovar(SessaoUsuario sessao, RetornoRepositorio<SessaoUsuario> retorno) {
            pedidos++;
            if (falhaMensagem != null) {
                retorno.aoFalhar(falhaMensagem);
                return;
            }
            retorno.aoConcluir(sessao("a2", "r2", LONGE));
        }
    }

    private static class Resultado implements RetornoRepositorio<String> {
        final CountDownLatch pronto = new CountDownLatch(1);
        volatile String valor;
        volatile String mensagem;
        volatile String codigo;

        @Override
        public void aoConcluir(String resultado) {
            valor = resultado;
            pronto.countDown();
        }

        @Override
        public void aoFalhar(String texto) {
            mensagem = texto;
            pronto.countDown();
        }

        @Override
        public void aoFalharComCodigo(String texto, String c) {
            mensagem = texto;
            codigo = c;
            pronto.countDown();
        }

        void esperar() throws InterruptedException {
            assertTrue("sem resposta", pronto.await(10, TimeUnit.SECONDS));
        }
    }

    private void iniciarPedido(ExecutorHttp executor, Resultado resultado) {
        executor.executarComSessao(
                token -> new Request.Builder().url(url()).header("Authorization", "Bearer " + token).build(),
                resultado,
                json -> json.get("valor").getAsString());
    }

    private Resultado pedir(ExecutorHttp executor) throws InterruptedException {
        Resultado resultado = new Resultado();
        iniciarPedido(executor, resultado);
        resultado.esperar();
        return resultado;
    }

    private RenovadorSessao renovador(RenovadorSessaoTeste.Memoria memoria, Renovacao renovacao) {
        return new RenovadorSessao(memoria, renovacao, Runnable::run);
    }

    @Test
    public void tokenValidoEnviaDireto() throws Exception {
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a2", "r2", LONGE));
        Renovacao renovacao = new Renovacao();

        Resultado resultado = pedir(executor(renovador(memoria, renovacao)));

        assertEquals("ok", resultado.valor);
        assertEquals(0, renovacao.pedidos);
    }

    @Test
    public void tokenVencidoRenovaAntesDeEnviar() throws Exception {
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", 1));
        Renovacao renovacao = new Renovacao();

        Resultado resultado = pedir(executor(renovador(memoria, renovacao)));

        assertEquals("ok", resultado.valor);
        assertEquals(1, renovacao.pedidos);
        assertEquals(Collections.singletonList("Bearer a2"), autorizacoes);
        assertEquals("r2", memoria.atual.getTokenRenovacao());
    }

    @Test
    public void respostaDe401RenovaUmaVezERepete() throws Exception {
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", LONGE));
        Renovacao renovacao = new Renovacao();

        Resultado resultado = pedir(executor(renovador(memoria, renovacao)));

        assertEquals("ok", resultado.valor);
        assertEquals(1, renovacao.pedidos);
        assertEquals(2, autorizacoes.size());
        assertEquals("Bearer a1", autorizacoes.get(0));
        assertEquals("Bearer a2", autorizacoes.get(1));
    }

    @Test
    public void seORepetidoTambemDer401ASessaoEncerra() throws Exception {
        tokenValido = "nenhum";
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", LONGE));
        Renovacao renovacao = new Renovacao();
        List<String> avisos = Collections.synchronizedList(new ArrayList<>());
        RenovadorSessao renovador = renovador(memoria, renovacao);
        renovador.adicionarOuvinte(avisos::add);

        Resultado resultado = pedir(executor(renovador));

        assertEquals(1, renovacao.pedidos);
        assertEquals(2, autorizacoes.size());
        assertNull(memoria.atual);
        assertEquals(1, avisos.size());
        assertEquals(MensagensErro.SESSAO_EXPIRADA, resultado.mensagem);
    }

    @Test
    public void contaBloqueadaEncerraSemTentarRenovar() throws Exception {
        codigoParaToken = 403;
        corpoParaToken = "{\"sucesso\":false,\"mensagem\":\"Sua conta foi bloqueada pela moderação do ACESSO.\","
                + "\"detalhes\":{\"codigo\":\"CONTA_BLOQUEADA\"}}";
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", LONGE));
        Renovacao renovacao = new Renovacao();
        List<String> avisos = Collections.synchronizedList(new ArrayList<>());
        RenovadorSessao renovador = renovador(memoria, renovacao);
        renovador.adicionarOuvinte(avisos::add);

        Resultado resultado = pedir(executor(renovador));

        assertEquals(0, renovacao.pedidos);
        assertNull(memoria.atual);
        assertEquals("Sua conta foi bloqueada pela moderação do ACESSO.", avisos.get(0));
        assertEquals(CodigosErro.CONTA_BLOQUEADA, resultado.codigo);
    }

    @Test
    public void senhaAlteradaEncerraSemTentarRenovar() throws Exception {
        corpoParaToken = "{\"sucesso\":false,\"mensagem\":\"Sua senha foi alterada. Entre novamente.\","
                + "\"detalhes\":{\"codigo\":\"SENHA_ALTERADA\"}}";
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", LONGE));
        Renovacao renovacao = new Renovacao();

        Resultado resultado = pedir(executor(renovador(memoria, renovacao)));

        assertEquals(0, renovacao.pedidos);
        assertNull(memoria.atual);
        assertEquals(CodigosErro.SENHA_ALTERADA, resultado.codigo);
    }

    @Test
    public void permissaoNegadaComumNaoEncerraASessao() throws Exception {
        tokenValido = "nenhum";
        codigoParaToken = 403;
        corpoParaToken = "{\"sucesso\":false,\"mensagem\":\"Você não possui permissão para esta ação.\"}";
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", LONGE));
        Renovacao renovacao = new Renovacao();

        Resultado resultado = pedir(executor(renovador(memoria, renovacao)));

        assertEquals(0, renovacao.pedidos);
        assertEquals("r1", memoria.atual.getTokenRenovacao());
        assertEquals("Você não possui permissão para esta ação.", resultado.mensagem);
    }

    @Test
    public void quedaDeRedeNaRenovacaoNaoEncerraASessao() throws Exception {
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", 1));
        Renovacao renovacao = new Renovacao();
        renovacao.falhaMensagem = MensagensErro.SERVIDOR_INACESSIVEL;

        Resultado resultado = pedir(executor(renovador(memoria, renovacao)));

        assertEquals(MensagensErro.SERVIDOR_INACESSIVEL, resultado.mensagem);
        assertNull(resultado.codigo);
        assertEquals("r1", memoria.atual.getTokenRenovacao());
        assertTrue(autorizacoes.isEmpty());
    }

    @Test
    public void duasRequisicoesCom401FazemUmaRenovacaoSo() throws Exception {
        RenovadorSessaoTeste.Memoria memoria = new RenovadorSessaoTeste.Memoria(sessao("a1", "r1", LONGE));
        Renovacao renovacao = new Renovacao();
        ExecutorHttp executor = executor(renovador(memoria, renovacao));
        Resultado a = new Resultado();
        Resultado b = new Resultado();

        iniciarPedido(executor, a);
        iniciarPedido(executor, b);
        a.esperar();
        b.esperar();

        assertEquals("ok", a.valor);
        assertEquals("ok", b.valor);
        // As duas usaram a1 e levaram 401; a segunda recebe a sessão que a primeira já renovou.
        assertEquals(1, renovacao.pedidos);
    }
}
