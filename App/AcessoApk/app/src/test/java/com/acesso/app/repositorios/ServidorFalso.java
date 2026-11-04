package com.acesso.app.repositorios;

import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.servicos.TradutorErrosApi;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;

/**
 * Servidor HTTP de mentira (só JDK) para os testes dos repositórios da API: responde por "METODO /caminho"
 * no formato da API do Site e guarda o que recebeu. Nada aqui toca a API real.
 */
final class ServidorFalso {

    private static final String CRLF = "" + (char) 13 + (char) 10;

    /** O que o servidor recebeu. */
    static final class Pedido {
        String metodo;
        String alvo;
        String autorizacao;
        String tipoConteudo;
        String corpo;
    }

    private final ServerSocket servidor;
    final List<Pedido> pedidos = Collections.synchronizedList(new ArrayList<>());
    private final Map<String, int[]> codigos = new HashMap<>();
    private final Map<String, String> corpos = new HashMap<>();

    ServidorFalso() throws IOException {
        servidor = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
        Thread atendimento = new Thread(() -> {
            while (!servidor.isClosed()) {
                try (Socket conexao = servidor.accept()) {
                    atender(conexao);
                } catch (IOException encerrado) {
                    // servidor fechado no fim do teste
                }
            }
        });
        atendimento.setDaemon(true);
        atendimento.start();
    }

    /** {@code rota} é "METODO /caminho", sem a query. */
    void responder(String rota, int codigo, String corpo) {
        codigos.put(rota, new int[]{codigo});
        corpos.put(rota, corpo);
    }

    String urlBase() {
        return "http://127.0.0.1:" + servidor.getLocalPort() + "/api/";
    }

    void parar() throws IOException {
        servidor.close();
    }

    /** Executor com sessão válida, que entrega na própria thread (sem Android). */
    static ExecutorHttp executor(SessaoUsuario sessao) {
        ExecutorHttp.ProvedorSessao provedor = new ExecutorHttp.ProvedorSessao() {
            @Override
            public SessaoUsuario atual() {
                return sessao;
            }

            @Override
            public void renovar(SessaoUsuario usada, RetornoRepositorio<SessaoUsuario> retorno) {
                throw new AssertionError("não devia renovar: o token do teste ainda vale");
            }

            @Override
            public void encerrar(String codigo, String mensagem) {
            }
        };
        return new ExecutorHttp(new OkHttpClient(), Runnable::run, () -> true, TradutorErrosApi::traduzir, provedor);
    }

    private void atender(Socket conexao) throws IOException {
        InputStream entrada = conexao.getInputStream();
        ByteArrayOutputStream cabecalho = new ByteArrayOutputStream();
        int anterior3 = 0, anterior2 = 0, anterior1 = 0, atual;
        while ((atual = entrada.read()) != -1) {
            cabecalho.write(atual);
            if (anterior3 == 13 && anterior2 == 10 && anterior1 == 13 && atual == 10) {
                break;
            }
            anterior3 = anterior2;
            anterior2 = anterior1;
            anterior1 = atual;
        }
        String[] linhas = cabecalho.toString("UTF-8").split(CRLF);
        String[] primeira = linhas[0].split(" ");
        Pedido pedido = new Pedido();
        pedido.metodo = primeira[0];
        pedido.alvo = primeira[1];
        int tamanho = 0;
        for (String linha : linhas) {
            String minuscula = linha.toLowerCase();
            if (minuscula.startsWith("authorization:")) {
                pedido.autorizacao = linha.substring(linha.indexOf(':') + 1).trim();
            }
            if (minuscula.startsWith("content-type:")) {
                pedido.tipoConteudo = linha.substring(linha.indexOf(':') + 1).trim();
            }
            if (minuscula.startsWith("content-length:")) {
                tamanho = Integer.parseInt(linha.substring(linha.indexOf(':') + 1).trim());
            }
        }
        byte[] corpo = new byte[tamanho];
        int lido = 0;
        while (lido < tamanho) {
            int n = entrada.read(corpo, lido, tamanho - lido);
            if (n < 0) {
                break;
            }
            lido += n;
        }
        pedido.corpo = new String(corpo, StandardCharsets.UTF_8);
        pedidos.add(pedido);

        String caminho = pedido.alvo.contains("?") ? pedido.alvo.substring(0, pedido.alvo.indexOf('?')) : pedido.alvo;
        String rota = pedido.metodo + " " + caminho;
        int codigo = codigos.containsKey(rota) ? codigos.get(rota)[0] : 404;
        String texto = corpos.containsKey(rota) ? corpos.get(rota)
                : "{\"sucesso\":false,\"mensagem\":\"Rota não encontrada.\"}";
        byte[] bytes = texto.getBytes(StandardCharsets.UTF_8);
        OutputStream saida = conexao.getOutputStream();
        saida.write(("HTTP/1.1 " + codigo + " X" + CRLF
                + "Content-Type: application/json" + CRLF
                + "Content-Length: " + bytes.length + CRLF
                + "Connection: close" + CRLF + CRLF).getBytes(StandardCharsets.UTF_8));
        saida.write(bytes);
        saida.flush();
    }

    /** Retorno que espera a resposta (sucesso ou falha) por até 5 segundos. */
    static final class Anotador<T> implements RetornoRepositorio<T> {
        final CountDownLatch pronto = new CountDownLatch(1);
        volatile T valor;
        volatile String mensagem;

        @Override
        public void aoConcluir(T resultado) {
            valor = resultado;
            pronto.countDown();
        }

        @Override
        public void aoFalhar(String texto) {
            mensagem = texto;
            pronto.countDown();
        }

        T aguardar() throws InterruptedException {
            assertTrue("a chamada não terminou", pronto.await(5, TimeUnit.SECONDS));
            return valor;
        }
    }
}
