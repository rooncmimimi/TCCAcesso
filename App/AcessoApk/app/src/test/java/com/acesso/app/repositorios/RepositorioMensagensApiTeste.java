package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.Mensagem;
import com.acesso.app.modelos.PermissaoConversa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.time.Instant;
import java.util.List;

/**
 * Chat contra o servidor falso, com respostas no formato de ConversaService (par canônico usuarioA/usuarioB,
 * mensagensNaoLidas, envelope de paginação). Confere rotas, corpo, o "outro" participante e a paginação.
 */
public class RepositorioMensagensApiTeste {

    /** "a1" < "b2": a conta logada (b2) fica do lado B, como acontece no banco com o par em ordem canônica. */
    private static final SessaoUsuario SESSAO = new SessaoUsuario("b2", "b@acesso.test", "Bia", TipoConta.PESSOA, null,
            "token-de-teste", "renovacao-de-teste", System.currentTimeMillis() + 3_600_000, "api");

    private ServidorFalso servidor;

    @Before
    public void iniciar() throws Exception {
        servidor = new ServidorFalso();
    }

    @After
    public void parar() throws Exception {
        servidor.parar();
    }

    private RepositorioMensagensApi repositorio() {
        return new RepositorioMensagensApi(ServidorFalso.executor(SESSAO), servidor.urlBase(), () -> true,
                () -> Instant.parse("2026-10-14T12:00:00.000Z").toEpochMilli());
    }

    private static final String CONVERSA = "{\"id\":\"c1\",\"usuarioAId\":\"a1\",\"usuarioBId\":\"b2\","
            + "\"usuarioA\":{\"id\":\"a1\",\"nome\":\"Resp\",\"tipoUsuario\":\"empresa\","
            + "\"empresa\":{\"nomeFantasia\":\"Empresa Falsa\"}},"
            + "\"usuarioB\":{\"id\":\"b2\",\"nome\":\"Bia\",\"tipoUsuario\":\"candidato\"},"
            + "\"ultimaMensagemPrevia\":\"Olá!\",\"ultimaMensagemEm\":\"2026-10-14T11:00:00.000Z\","
            + "\"mensagensNaoLidas\":2}";

    @Test
    public void listaConversasDoPontoDeVistaDaContaLogada() throws Exception {
        servidor.responder("GET /api/conversas", 200, "{\"sucesso\":true,\"total\":1,\"conversas\":[" + CONVERSA + "]}");
        ServidorFalso.Anotador<List<Conversa>> anotador = new ServidorFalso.Anotador<>();

        repositorio().listarConversas(SESSAO, anotador);

        Conversa conversa = anotador.aguardar().get(0);
        assertEquals("a1", conversa.outroUsuarioId);
        assertEquals("o nome da empresa vem antes do nome da conta", "Empresa Falsa", conversa.nomeOutro);
        assertEquals(TipoConta.EMPRESA, conversa.tipoOutro);
        assertEquals("Olá!", conversa.previa);
        assertEquals("há 1 hora", conversa.quando);
        assertEquals(2, conversa.naoLidas);
        assertEquals("Bearer token-de-teste", servidor.pedidos.get(0).autorizacao);
    }

    @Test
    public void outroParticipanteRemovidoDeixaAConversaSomenteLeitura() throws Exception {
        servidor.responder("GET /api/conversas/c1", 200, "{\"sucesso\":true,\"conversa\":{\"id\":\"c1\","
                + "\"usuarioAId\":null,\"usuarioBId\":\"b2\",\"usuarioA\":null,"
                + "\"usuarioB\":{\"id\":\"b2\",\"nome\":\"Bia\"}}}");
        ServidorFalso.Anotador<Conversa> anotador = new ServidorFalso.Anotador<>();

        repositorio().carregarConversa(SESSAO, "c1", anotador);

        assertTrue(anotador.aguardar().outroRemovido());
    }

    @Test
    public void abrirConversaEnviaOUsuarioDeDestino() throws Exception {
        servidor.responder("POST /api/conversas", 201, "{\"sucesso\":true,\"conversa\":" + CONVERSA + "}");
        ServidorFalso.Anotador<Conversa> anotador = new ServidorFalso.Anotador<>();

        repositorio().abrirConversa(SESSAO, "a1", anotador);

        assertEquals("c1", anotador.aguardar().id);
        assertEquals("POST", servidor.pedidos.get(0).metodo);
        assertEquals("{\"usuarioId\":\"a1\"}", servidor.pedidos.get(0).corpo);
    }

    @Test
    public void conversaRecusadaPelaPreferenciaChegaComOMotivoDaApi() throws Exception {
        servidor.responder("POST /api/conversas", 403, "{\"sucesso\":false,"
                + "\"mensagem\":\"Este usuário desativou o recebimento de novas mensagens.\"}");
        ServidorFalso.Anotador<Conversa> anotador = new ServidorFalso.Anotador<>();

        repositorio().abrirConversa(SESSAO, "a1", anotador);

        assertNull(anotador.aguardar());
        assertEquals("Este usuário desativou o recebimento de novas mensagens.", anotador.mensagem);
    }

    @Test
    public void podeIniciarLePermissaoEMotivo() throws Exception {
        servidor.responder("GET /api/conversas/pode-iniciar/a1", 200, "{\"sucesso\":true,\"permitido\":false,"
                + "\"motivo\":\"Apenas empresas podem iniciar conversas com este usuário.\",\"codigo\":403}");
        ServidorFalso.Anotador<PermissaoConversa> anotador = new ServidorFalso.Anotador<>();

        repositorio().podeIniciar(SESSAO, "a1", anotador);

        PermissaoConversa permissao = anotador.aguardar();
        assertFalse(permissao.permitido);
        assertEquals("Apenas empresas podem iniciar conversas com este usuário.", permissao.motivo);
    }

    @Test
    public void mensagensDeUmaPaginaSoFazemUmaChamada() throws Exception {
        servidor.responder("GET /api/conversas/c1/mensagens", 200, "{\"sucesso\":true,\"total\":2,\"pagina\":1,"
                + "\"limite\":100,\"totalPaginas\":1,\"mensagens\":["
                + "{\"id\":\"m1\",\"remetenteId\":\"a1\",\"conteudo\":\"Oi\",\"lida\":true,\"criadoEm\":\"2026-10-14T10:00:00.000Z\"},"
                + "{\"id\":\"m2\",\"remetenteId\":\"b2\",\"conteudo\":\"Olá!\",\"lida\":false,\"criadoEm\":\"2026-10-14T11:00:00.000Z\"}]}");
        ServidorFalso.Anotador<List<Mensagem>> anotador = new ServidorFalso.Anotador<>();

        repositorio().listarMensagens(SESSAO, "c1", anotador);

        List<Mensagem> mensagens = anotador.aguardar();
        assertEquals(2, mensagens.size());
        assertEquals("a1", mensagens.get(0).remetenteId);
        assertEquals(Instant.parse("2026-10-14T11:00:00.000Z").toEpochMilli(), mensagens.get(1).enviadaEm);
        assertEquals(1, servidor.pedidos.size());
        assertTrue(servidor.pedidos.get(0).alvo, servidor.pedidos.get(0).alvo.contains("limit=100"));
        assertTrue(servidor.pedidos.get(0).alvo, servidor.pedidos.get(0).alvo.contains("page=1"));
    }

    @Test
    public void conversaLongaBuscaAsDuasUltimasPaginas() throws Exception {
        // O servidor falso responde a mesma coisa para qualquer página; o que importa são as páginas pedidas.
        servidor.responder("GET /api/conversas/c1/mensagens", 200, "{\"sucesso\":true,\"totalPaginas\":3,"
                + "\"mensagens\":[{\"id\":\"m\",\"remetenteId\":\"a1\",\"conteudo\":\"Oi\"}]}");
        ServidorFalso.Anotador<List<Mensagem>> anotador = new ServidorFalso.Anotador<>();

        repositorio().listarMensagens(SESSAO, "c1", anotador);

        assertEquals("penúltima + última página", 2, anotador.aguardar().size());
        assertEquals(3, servidor.pedidos.size());
        assertTrue(servidor.pedidos.get(1).alvo, servidor.pedidos.get(1).alvo.contains("page=2"));
        assertTrue(servidor.pedidos.get(2).alvo, servidor.pedidos.get(2).alvo.contains("page=3"));
    }

    @Test
    public void enviarMandaOConteudoELeAMensagemGravada() throws Exception {
        servidor.responder("POST /api/conversas/c1/mensagens", 201, "{\"sucesso\":true,\"mensagem\":"
                + "{\"id\":\"m3\",\"conversaId\":\"c1\",\"remetenteId\":\"b2\",\"conteudo\":\"Tudo bem?\",\"lida\":false}}");
        ServidorFalso.Anotador<Mensagem> anotador = new ServidorFalso.Anotador<>();

        repositorio().enviar(SESSAO, "c1", "Tudo bem?", anotador);

        Mensagem mensagem = anotador.aguardar();
        assertEquals("m3", mensagem.id);
        assertEquals("{\"conteudo\":\"Tudo bem?\"}", servidor.pedidos.get(0).corpo);
    }

    @Test
    public void naoParticipanteRecebeOErroDaApi() throws Exception {
        servidor.responder("POST /api/conversas/c1/mensagens", 403,
                "{\"sucesso\":false,\"mensagem\":\"Você não participa desta conversa.\"}");
        ServidorFalso.Anotador<Mensagem> anotador = new ServidorFalso.Anotador<>();

        repositorio().enviar(SESSAO, "c1", "Oi", anotador);

        assertNull(anotador.aguardar());
        assertEquals("Você não participa desta conversa.", anotador.mensagem);
    }

    @Test
    public void marcarComoLidasUsaPatch() throws Exception {
        servidor.responder("PATCH /api/conversas/c1/mensagens/lidas", 200, "{\"sucesso\":true}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().marcarComoLidas(SESSAO, "c1", anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals("PATCH", servidor.pedidos.get(0).metodo);
    }

    @Test
    public void contaNaoLidas() throws Exception {
        servidor.responder("GET /api/conversas/nao-lidas", 200, "{\"sucesso\":true,\"naoLidas\":7}");
        ServidorFalso.Anotador<Integer> anotador = new ServidorFalso.Anotador<>();

        repositorio().contarNaoLidas(SESSAO, anotador);

        assertEquals(Integer.valueOf(7), anotador.aguardar());
    }

    @Test
    public void idInvalidoNaoChamaAApi() throws Exception {
        ServidorFalso.Anotador<List<Mensagem>> anotador = new ServidorFalso.Anotador<>();

        repositorio().listarMensagens(SESSAO, "../usuarios", anotador);

        assertNull(anotador.aguardar());
        assertNotNull(anotador.mensagem);
        assertTrue(servidor.pedidos.isEmpty());
    }
}
