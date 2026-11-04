package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.Notificacao;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.time.Instant;
import java.util.List;

/** Notificações contra o servidor falso, no formato de NotificacaoService. */
public class RepositorioNotificacoesApiTeste {

    private static final SessaoUsuario SESSAO = new SessaoUsuario("u1", "a@acesso.test", "Ana", TipoConta.PESSOA, null,
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

    private RepositorioNotificacoesApi repositorio() {
        return new RepositorioNotificacoesApi(ServidorFalso.executor(SESSAO), servidor.urlBase(), () -> true,
                () -> Instant.parse("2026-10-14T12:00:00.000Z").toEpochMilli());
    }

    @Test
    public void listaLeTipoDestinoEQuemAgiu() throws Exception {
        servidor.responder("GET /api/notificacoes", 200, "{\"sucesso\":true,\"notificacoes\":[{\"id\":\"n1\","
                + "\"tipo\":\"mensagem\",\"subtipo\":\"mensagem_nova\",\"titulo\":\"Nova mensagem recebida\","
                + "\"descricao\":\"Resp: Olá\",\"lida\":false,\"criadoEm\":\"2026-10-14T11:30:00.000Z\","
                + "\"entidadeTipo\":\"conversa\",\"entidadeId\":\"c1\",\"atorId\":\"e9\",\"ator\":{\"nome\":\"Resp\"}}]}");
        ServidorFalso.Anotador<List<Notificacao>> anotador = new ServidorFalso.Anotador<>();

        repositorio().listar(SESSAO, anotador);

        Notificacao notificacao = anotador.aguardar().get(0);
        assertEquals("mensagem", notificacao.tipo);
        assertEquals("conversa", notificacao.entidadeTipo);
        assertEquals("c1", notificacao.entidadeId);
        assertEquals("Resp", notificacao.atorNome);
        assertFalse(notificacao.lida);
        assertEquals("há 30 minutos", notificacao.quando);
        assertTrue(servidor.pedidos.get(0).alvo, servidor.pedidos.get(0).alvo.contains("limit=50"));
    }

    @Test
    public void marcarUmaComoLidaUsaARotaDaNotificacao() throws Exception {
        servidor.responder("PATCH /api/notificacoes/n1/lida", 200, "{\"sucesso\":true}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().marcarComoLida(SESSAO, "n1", anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals("PATCH", servidor.pedidos.get(0).metodo);
    }

    @Test
    public void marcarTodasUsaARotaGeral() throws Exception {
        servidor.responder("PATCH /api/notificacoes/lidas", 200, "{\"sucesso\":true}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().marcarTodasComoLidas(SESSAO, anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
    }

    @Test
    public void contaNaoLidas() throws Exception {
        servidor.responder("GET /api/notificacoes/nao-lidas", 200, "{\"sucesso\":true,\"naoLidas\":3}");
        ServidorFalso.Anotador<Integer> anotador = new ServidorFalso.Anotador<>();

        repositorio().contarNaoLidas(SESSAO, anotador);

        assertEquals(Integer.valueOf(3), anotador.aguardar());
    }
}
