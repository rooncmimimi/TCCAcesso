package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.servicos.TradutorErrosApi;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

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
 * Repositório de conteúdo contra um servidor HTTP de mentira (só JDK) com respostas no formato
 * da API do Site: confere rota, método, cabeçalho de autorização, query, corpo e a leitura da resposta.
 * Nada aqui toca a API real.
 */
public class RepositorioConteudoApiTeste {

    private static final String CRLF = "" + (char) 13 + (char) 10;

    /** O que o servidor recebeu. */
    private static class Pedido {
        String metodo;
        String alvo;
        String autorizacao;
        String corpo;
    }

    private static class Resposta {
        final int codigo;
        final String corpo;

        Resposta(int codigo, String corpo) {
            this.codigo = codigo;
            this.corpo = corpo;
        }
    }

    private ServerSocket servidor;
    private final List<Pedido> pedidos = Collections.synchronizedList(new ArrayList<>());
    /** "METODO /caminho" -> resposta. */
    private final Map<String, Resposta> respostas = new HashMap<>();

    @Before
    public void iniciar() throws IOException {
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

    @After
    public void parar() throws IOException {
        servidor.close();
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
        Resposta resposta = respostas.get(pedido.metodo + " " + caminho);
        if (resposta == null) {
            resposta = new Resposta(404, "{\"sucesso\":false,\"mensagem\":\"Rota não encontrada.\"}");
        }
        byte[] bytes = resposta.corpo.getBytes(StandardCharsets.UTF_8);
        OutputStream saida = conexao.getOutputStream();
        saida.write(("HTTP/1.1 " + resposta.codigo + " X" + CRLF
                + "Content-Type: application/json" + CRLF
                + "Content-Length: " + bytes.length + CRLF
                + "Connection: close" + CRLF + CRLF).getBytes(StandardCharsets.UTF_8));
        saida.write(bytes);
        saida.flush();
    }

    private static final SessaoUsuario SESSAO = new SessaoUsuario("u1", "a@acesso.test", "Ana", TipoConta.PESSOA, null,
            "token-de-teste", "renovacao-de-teste", System.currentTimeMillis() + 3_600_000, "api");

    private RepositorioConteudoApi repositorio(boolean configurada) {
        ExecutorHttp.ProvedorSessao provedor = new ExecutorHttp.ProvedorSessao() {
            @Override
            public SessaoUsuario atual() {
                return SESSAO;
            }

            @Override
            public void renovar(SessaoUsuario usada, RetornoRepositorio<SessaoUsuario> retorno) {
                throw new AssertionError("não devia renovar: o token do teste ainda vale");
            }

            @Override
            public void encerrar(String codigo, String mensagem) {
            }
        };
        ExecutorHttp executor = new ExecutorHttp(new OkHttpClient(), Runnable::run, () -> true,
                TradutorErrosApi::traduzir, provedor);
        String base = "http://127.0.0.1:" + servidor.getLocalPort() + "/api/";
        return new RepositorioConteudoApi(executor, base, () -> configurada,
                () -> java.time.Instant.parse("2026-10-14T12:00:00.000Z").toEpochMilli());
    }

    private static class Anotador<T> implements RetornoRepositorio<T> {
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

    @Test
    public void listarVagasPedeAsRotasEOsFiltrosDaApi() throws Exception {
        respostas.put("GET /api/vagas", new Resposta(200, "{\"sucesso\":true,\"total\":1,\"vagas\":[{\"id\":\"v1\","
                + "\"titulo\":\"Analista\",\"empresa\":{\"nomeFantasia\":\"Empresa Falsa\"}}]}"));
        Anotador<List<Vaga>> anotador = new Anotador<>();

        repositorio(true).listarVagas(SESSAO, " intérprete ", "remoto", null, anotador);

        List<Vaga> vagas = anotador.aguardar();
        assertEquals("Empresa Falsa", vagas.get(0).nomeEmpresa);
        Pedido pedido = pedidos.get(0);
        assertEquals("GET", pedido.metodo);
        assertEquals("Bearer token-de-teste", pedido.autorizacao);
        assertTrue(pedido.alvo, pedido.alvo.contains("search=int%C3%A9rprete"));
        assertTrue(pedido.alvo, pedido.alvo.contains("modalidade=remoto"));
        assertTrue(pedido.alvo, pedido.alvo.contains("limit=20"));
        assertTrue(pedido.alvo, pedido.alvo.contains("page=1"));
        assertTrue("sem filtro de público, o parâmetro não vai", !pedido.alvo.contains("publicoAlvo"));
    }

    @Test
    public void listarPublicacoesLeOFeed() throws Exception {
        respostas.put("GET /api/postagens", new Resposta(200, "{\"sucesso\":true,\"postagens\":[{\"id\":\"p1\","
                + "\"conteudo\":\"Olá\",\"criadoEm\":\"2026-10-14T11:00:00.000Z\",\"totalCurtidas\":1,"
                + "\"totalComentarios\":0,\"usuario\":{\"nome\":\"Ana\",\"tipoUsuario\":\"candidato\"}}]}"));
        Anotador<List<Publicacao>> anotador = new Anotador<>();

        repositorio(true).listarPublicacoes(SESSAO, anotador);

        Publicacao p = anotador.aguardar().get(0);
        assertEquals("Ana", p.nomeAutor);
        assertEquals("há 1 hora", p.quando);
        assertTrue(pedidos.get(0).alvo.contains("limit=20"));
    }

    @Test
    public void buscarUsaQETipoDaApi() throws Exception {
        respostas.put("GET /api/busca", new Resposta(200, "{\"resultados\":{\"empresas\":[{\"id\":\"e1\","
                + "\"nomeFantasia\":\"Empresa Falsa\"}]}}"));
        Anotador<List<ItemBusca>> anotador = new Anotador<>();

        repositorio(true).buscar(SESSAO, "falsa", ItemBusca.Categoria.EMPRESAS, anotador);

        assertEquals("Empresa Falsa", anotador.aguardar().get(0).titulo);
        assertTrue(pedidos.get(0).alvo, pedidos.get(0).alvo.contains("q=falsa"));
        assertTrue(pedidos.get(0).alvo, pedidos.get(0).alvo.contains("tipo=empresas"));
    }

    @Test
    public void painelDaEmpresaFazAsDuasChamadasEJuntaOResultado() throws Exception {
        respostas.put("GET /api/dashboard/empresa", new Resposta(200,
                "{\"sucesso\":true,\"metricas\":{\"vagas\":2,\"vagasAbertas\":1,\"candidaturas\":4,\"seguidores\":3}}"));
        respostas.put("GET /api/vagas/minhas", new Resposta(200,
                "{\"sucesso\":true,\"vagas\":[{\"id\":\"v1\",\"titulo\":\"Analista\",\"totalCandidaturas\":4}]}"));
        Anotador<ResumoEmpresa> anotador = new Anotador<>();

        repositorio(true).carregarResumoEmpresa(SESSAO, anotador);

        ResumoEmpresa resumo = anotador.aguardar();
        assertEquals(2, resumo.vagasPublicadas);
        assertEquals(3, resumo.seguidores);
        assertEquals(4, resumo.vagas.get(0).totalCandidaturas);
        assertEquals(2, pedidos.size());
    }

    @Test
    public void empresaPendenteVeAMensagemDaApiNoPainel() throws Exception {
        respostas.put("GET /api/dashboard/empresa", new Resposta(403,
                "{\"sucesso\":false,\"mensagem\":\"Sua empresa ainda está em análise.\"}"));
        Anotador<ResumoEmpresa> anotador = new Anotador<>();

        repositorio(true).carregarResumoEmpresa(SESSAO, anotador);

        assertNull(anotador.aguardar());
        assertEquals("Sua empresa ainda está em análise.", anotador.mensagem);
        assertEquals("a segunda chamada não deve acontecer", 1, pedidos.size());
    }

    @Test
    public void publicarEnviaJsonComOConteudo() throws Exception {
        respostas.put("POST /api/postagens", new Resposta(201, "{\"sucesso\":true,\"postagem\":{\"id\":\"p1\"}}"));
        Anotador<Void> anotador = new Anotador<>();

        repositorio(true).publicar(SESSAO, "Olá, pessoal", anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        Pedido pedido = pedidos.get(0);
        assertEquals("POST", pedido.metodo);
        assertEquals("{\"conteudo\":\"Olá, pessoal\"}", pedido.corpo);
        assertEquals("Bearer token-de-teste", pedido.autorizacao);
    }

    @Test
    public void criarVagaEnviaOsCamposDaApi() throws Exception {
        respostas.put("POST /api/vagas", new Resposta(201, "{\"sucesso\":true,\"vaga\":{\"id\":\"v1\"}}"));
        Anotador<Void> anotador = new Anotador<>();
        Vaga vaga = new Vaga();
        vaga.titulo = "Analista de suporte";
        vaga.descricao = "Atendimento a clientes pelo chat";
        vaga.modalidade = "remoto";
        vaga.status = "aberta";

        repositorio(true).criarVaga(SESSAO, vaga, anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals("POST", pedidos.get(0).metodo);
        assertTrue(pedidos.get(0).corpo, pedidos.get(0).corpo.contains("\"titulo\":\"Analista de suporte\""));
        assertTrue(pedidos.get(0).corpo, pedidos.get(0).corpo.contains("\"modalidade\":\"remoto\""));
    }

    @Test
    public void erroDeValidacaoDaApiChegaComAMensagem() throws Exception {
        respostas.put("POST /api/vagas", new Resposta(400,
                "{\"sucesso\":false,\"mensagem\":\"Dados inválidos.\",\"erros\":[{\"campo\":\"titulo\","
                        + "\"mensagem\":\"O título deve ter entre 5 e 200 caracteres.\"}]}"));
        Anotador<Void> anotador = new Anotador<>();

        repositorio(true).criarVaga(SESSAO, new Vaga(), anotador);

        anotador.aguardar();
        assertNotNull(anotador.mensagem);
    }

    private static final SessaoUsuario SESSAO_EMPRESA = new SessaoUsuario("u2", "e@acesso.test", "Resp", TipoConta.EMPRESA,
            "aprovada", "token-de-teste", "renovacao-de-teste", System.currentTimeMillis() + 3_600_000, "api");

    @Test
    public void perfilDaPessoaPedeOPerfilConsolidadoComExperienciasEFormacao() throws Exception {
        respostas.put("GET /api/perfil/candidatos/usuario/u1", new Resposta(200, "{\"sucesso\":true,\"candidato\":{"
                + "\"usuarioId\":\"u1\",\"tituloProfissional\":\"Analista\",\"cidade\":\"Recife\",\"estado\":\"PE\","
                + "\"biografia\":\"Gosto de dados.\",\"usuario\":{\"id\":\"u1\",\"nome\":\"Ana Falsa\"},"
                + "\"habilidades\":[{\"nome\":\"Excel\"},{\"nome\":\" \"}],"
                + "\"experiencias\":[{\"cargo\":\"Analista\",\"empresa\":\"Empresa Falsa\",\"dataInicio\":\"2020-03-01\","
                + "\"atual\":true}],"
                + "\"formacoes\":[{\"curso\":\"ADS\",\"instituicao\":\"Fatec Falsa\",\"dataInicio\":\"2016-02-01\","
                + "\"dataFim\":\"2018-12-15\",\"emAndamento\":false}]}}"));
        Anotador<com.acesso.app.modelos.PerfilConta> anotador = new Anotador<>();

        repositorio(true).carregarPerfil(SESSAO, anotador);

        com.acesso.app.modelos.PerfilConta perfil = anotador.aguardar();
        assertEquals("Ana Falsa", perfil.nome);
        assertEquals("Analista · Recife - PE", perfil.detalhe);
        assertEquals("Gosto de dados.", perfil.sobre);
        assertEquals(Collections.singletonList("Excel"), perfil.habilidades);
        assertEquals("mar/2020 – atual", perfil.experiencias.get(0).periodo);
        assertEquals("Empresa Falsa", perfil.experiencias.get(0).subtitulo);
        assertEquals("fev/2016 – dez/2018", perfil.formacoes.get(0).periodo);
        assertEquals(1, pedidos.size());
        assertEquals("GET", pedidos.get(0).metodo);
        assertEquals("/api/perfil/candidatos/usuario/u1", pedidos.get(0).alvo);
        assertEquals("Bearer token-de-teste", pedidos.get(0).autorizacao);
    }

    @Test
    public void perfilDaEmpresaPedeEmpresasMe() throws Exception {
        respostas.put("GET /api/empresas/me", new Resposta(200, "{\"sucesso\":true,\"empresa\":{"
                + "\"nomeFantasia\":\"Empresa Falsa\",\"statusAprovacao\":\"pendente\",\"usuario\":{\"nome\":\"Resp\"}}}"));
        Anotador<com.acesso.app.modelos.PerfilConta> anotador = new Anotador<>();

        repositorio(true).carregarPerfil(SESSAO_EMPRESA, anotador);

        com.acesso.app.modelos.PerfilConta perfil = anotador.aguardar();
        assertEquals("Empresa Falsa", perfil.nome);
        assertEquals("pendente", perfil.statusEmpresa);
        assertEquals("/api/empresas/me", pedidos.get(0).alvo);
    }

    @Test
    public void perfilNaoEncontradoChegaComAMensagemDaApi() throws Exception {
        respostas.put("GET /api/perfil/candidatos/usuario/u1", new Resposta(404,
                "{\"sucesso\":false,\"mensagem\":\"Perfil de candidato não encontrado.\"}"));
        Anotador<com.acesso.app.modelos.PerfilConta> anotador = new Anotador<>();

        repositorio(true).carregarPerfil(SESSAO, anotador);

        assertNull(anotador.aguardar());
        assertEquals("Perfil de candidato não encontrado.", anotador.mensagem);
    }

    @Test
    public void perfilDeOutraContaDescobreOTipoEDepoisBuscaAEmpresa() throws Exception {
        respostas.put("GET /api/perfil/usuario/e9", new Resposta(200,
                "{\"sucesso\":true,\"usuario\":{\"id\":\"e9\",\"nome\":\"Resp\",\"tipoUsuario\":\"empresa\"}}"));
        respostas.put("GET /api/empresas/usuario/e9", new Resposta(200, "{\"sucesso\":true,\"empresa\":{"
                + "\"usuarioId\":\"e9\",\"nomeFantasia\":\"Empresa Falsa\",\"setor\":\"Tecnologia\",\"porte\":\"media\","
                + "\"descricao\":\"Somos inclusivos.\",\"vagas\":[{\"id\":\"v1\",\"titulo\":\"Analista\",\"status\":\"aberta\"}]}}"));
        Anotador<com.acesso.app.modelos.PerfilConta> anotador = new Anotador<>();

        repositorio(true).carregarPerfilDeUsuario(SESSAO, "e9", anotador);

        com.acesso.app.modelos.PerfilConta perfil = anotador.aguardar();
        assertEquals(TipoConta.EMPRESA, perfil.tipoConta);
        assertEquals("Empresa Falsa", perfil.nome);
        assertEquals("e9", perfil.usuarioId);
        assertEquals("Tecnologia", perfil.detalhe);
        assertEquals("Somos inclusivos.", perfil.sobre);
        assertEquals("Empresa Falsa", perfil.vagasAbertas.get(0).nomeEmpresa);
        assertEquals(2, pedidos.size());
        assertEquals("/api/empresas/usuario/e9", pedidos.get(1).alvo);
    }

    @Test
    public void perfilDeContaInexistenteChegaComAMensagemDaApi() throws Exception {
        respostas.put("GET /api/perfil/usuario/u7", new Resposta(404,
                "{\"sucesso\":false,\"mensagem\":\"Usuário não encontrado.\"}"));
        Anotador<com.acesso.app.modelos.PerfilConta> anotador = new Anotador<>();

        repositorio(true).carregarPerfilDeUsuario(SESSAO, "u7", anotador);

        assertNull(anotador.aguardar());
        assertEquals("Usuário não encontrado.", anotador.mensagem);
        assertEquals("a segunda chamada não deve acontecer", 1, pedidos.size());
    }

    @Test
    public void idComBarraNaoMontaOutraRota() throws Exception {
        Anotador<Vaga> anotador = new Anotador<>();

        repositorio(true).obterVaga(SESSAO, "../usuarios", anotador);

        assertNull(anotador.aguardar());
        assertNotNull(anotador.mensagem);
        assertTrue(pedidos.isEmpty());
    }

    @Test
    public void detalheDaVagaLeOsCamposEAContaDaEmpresa() throws Exception {
        respostas.put("GET /api/vagas/v1", new Resposta(200, "{\"sucesso\":true,\"vaga\":{\"id\":\"v1\","
                + "\"titulo\":\"Analista\",\"requisitos\":\"Excel\",\"salario\":\"3500.00\",\"cargaHoraria\":\"40h\","
                + "\"status\":\"aberta\",\"criadoEm\":\"2026-10-12T12:00:00.000Z\","
                + "\"empresa\":{\"usuarioId\":\"e9\",\"nomeFantasia\":\"Empresa Falsa\",\"empresaVerificada\":true}}}"));
        Anotador<Vaga> anotador = new Anotador<>();

        repositorio(true).obterVaga(SESSAO, "v1", anotador);

        Vaga vaga = anotador.aguardar();
        assertEquals("Excel", vaga.requisitos);
        assertEquals("R$ 3.500,00", vaga.salario);
        assertEquals("40h", vaga.cargaHoraria);
        assertEquals("e9", vaga.empresaUsuarioId);
        assertTrue(vaga.empresaVerificada);
        assertEquals("há 2 dias", vaga.quando);
    }

    @Test
    public void candidatarEnviaAApresentacaoParaAVaga() throws Exception {
        respostas.put("POST /api/vagas/v1/candidaturas", new Resposta(201, "{\"sucesso\":true,\"candidatura\":{}}"));
        Anotador<Void> anotador = new Anotador<>();

        repositorio(true).candidatar(SESSAO, "v1", "Tenho experiência.", anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals("POST", pedidos.get(0).metodo);
        assertEquals("{\"mensagem\":\"Tenho experiência.\"}", pedidos.get(0).corpo);
    }

    @Test
    public void candidaturaRepetidaChegaComAMensagemDaApi() throws Exception {
        respostas.put("POST /api/vagas/v1/candidaturas", new Resposta(409,
                "{\"sucesso\":false,\"mensagem\":\"Você já se candidatou a esta vaga.\"}"));
        Anotador<Void> anotador = new Anotador<>();

        repositorio(true).candidatar(SESSAO, "v1", "", anotador);

        anotador.aguardar();
        assertEquals("Você já se candidatou a esta vaga.", anotador.mensagem);
        assertEquals("apresentação vazia não vai no corpo", "{}", pedidos.get(0).corpo);
    }

    @Test
    public void minhasCandidaturasLeVagaEmpresaESituacao() throws Exception {
        respostas.put("GET /api/candidaturas/minhas", new Resposta(200, "{\"sucesso\":true,\"candidaturas\":[{"
                + "\"id\":\"c1\",\"status\":\"em_analise\",\"criadoEm\":\"2026-10-11T12:00:00.000Z\","
                + "\"vaga\":{\"id\":\"v1\",\"titulo\":\"Analista\",\"empresa\":{\"razaoSocial\":\"Falsa Ltda\"}}}]}"));
        Anotador<List<com.acesso.app.modelos.Candidatura>> anotador = new Anotador<>();

        repositorio(true).listarCandidaturas(SESSAO, anotador);

        com.acesso.app.modelos.Candidatura candidatura = anotador.aguardar().get(0);
        assertEquals("v1", candidatura.vagaId);
        assertEquals("Analista", candidatura.tituloVaga);
        assertEquals("Falsa Ltda", candidatura.nomeEmpresa);
        assertEquals("em_analise", candidatura.status);
        assertEquals("há 3 dias", candidatura.quando);
    }

    @Test
    public void curtirUsaARotaDeCurtidasELeOTotal() throws Exception {
        respostas.put("POST /api/postagens/p1/curtidas", new Resposta(200,
                "{\"sucesso\":true,\"curtido\":true,\"totalCurtidas\":5}"));
        Anotador<Publicacao.Curtida> anotador = new Anotador<>();

        repositorio(true).curtir(SESSAO, "p1", anotador);

        Publicacao.Curtida curtida = anotador.aguardar();
        assertTrue(curtida.curtido);
        assertEquals(5, curtida.total);
        assertEquals("Bearer token-de-teste", pedidos.get(0).autorizacao);
    }

    @Test
    public void semUrlConfiguradaNaoChamaNada() throws Exception {
        Anotador<List<Vaga>> anotador = new Anotador<>();

        repositorio(false).listarVagas(SESSAO, "", null, null, anotador);

        assertNull(anotador.aguardar());
        assertTrue(anotador.mensagem, anotador.mensagem.contains("URL_API"));
        assertTrue(pedidos.isEmpty());
    }
}
