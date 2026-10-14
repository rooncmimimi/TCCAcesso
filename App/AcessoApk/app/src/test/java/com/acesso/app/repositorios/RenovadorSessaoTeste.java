package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.servicos.CodigosErro;

import org.junit.Test;

import java.util.ArrayList;
import java.util.List;

/** Renovação única, sessão já renovada por outro, falha definitiva x passageira. */
public class RenovadorSessaoTeste {

    static SessaoUsuario sessao(String acesso, String renovacao) {
        return new SessaoUsuario("u1", "a@acesso.test", "Ana", TipoConta.PESSOA, null, acesso, renovacao, 0, "api");
    }

    /** Guarda a sessão na memória. */
    static class Memoria implements RenovadorSessao.Armazenamento {
        volatile SessaoUsuario atual;

        Memoria(SessaoUsuario inicial) {
            atual = inicial;
        }

        @Override
        public SessaoUsuario obter() {
            return atual;
        }

        @Override
        public void salvar(SessaoUsuario sessao) {
            atual = sessao;
        }

        @Override
        public void limpar() {
            atual = null;
        }
    }

    /** Servidor de mentira: guarda os pedidos e só responde quando o teste mandar. */
    static class ServidorManual implements RenovadorSessao.Acao {
        final List<SessaoUsuario> pedidos = new ArrayList<>();
        final List<RetornoRepositorio<SessaoUsuario>> retornos = new ArrayList<>();

        @Override
        public void renovar(SessaoUsuario sessao, RetornoRepositorio<SessaoUsuario> retorno) {
            pedidos.add(sessao);
            retornos.add(retorno);
        }
    }

    static class Anotador implements RetornoRepositorio<SessaoUsuario> {
        SessaoUsuario sessao;
        String mensagem;
        String codigo;

        @Override
        public void aoConcluir(SessaoUsuario resultado) {
            sessao = resultado;
        }

        @Override
        public void aoFalhar(String texto) {
            mensagem = texto;
        }

        @Override
        public void aoFalharComCodigo(String texto, String c) {
            mensagem = texto;
            codigo = c;
        }
    }

    @Test
    public void duasTelasRenovandoJuntasFazemUmaSoChamada() {
        SessaoUsuario velha = sessao("a1", "r1");
        Memoria memoria = new Memoria(velha);
        ServidorManual servidor = new ServidorManual();
        RenovadorSessao renovador = new RenovadorSessao(memoria, servidor, Runnable::run);
        Anotador primeira = new Anotador();
        Anotador segunda = new Anotador();

        renovador.renovar(velha, primeira);
        renovador.renovar(velha, segunda);

        assertEquals(1, servidor.pedidos.size());
        servidor.retornos.get(0).aoConcluir(sessao("a2", "r2"));

        assertEquals("a2", primeira.sessao.getTokenAcesso());
        assertEquals("a2", segunda.sessao.getTokenAcesso());
        assertEquals("r2", memoria.atual.getTokenRenovacao());
    }

    @Test
    public void quemChegaComSessaoAntigaRecebeASalvaSemFalarComOServidor() {
        SessaoUsuario velha = sessao("a1", "r1");
        Memoria memoria = new Memoria(sessao("a2", "r2"));
        ServidorManual servidor = new ServidorManual();
        RenovadorSessao renovador = new RenovadorSessao(memoria, servidor, Runnable::run);
        Anotador anotador = new Anotador();

        renovador.renovar(velha, anotador);

        // Reapresentar r1 (já substituído) faria o servidor derrubar todas as sessões da conta.
        assertTrue(servidor.pedidos.isEmpty());
        assertEquals("r2", anotador.sessao.getTokenRenovacao());
    }

    @Test
    public void semSessaoSalvaFalhaComoExpirada() {
        RenovadorSessao renovador = new RenovadorSessao(new Memoria(null), new ServidorManual(), Runnable::run);
        Anotador anotador = new Anotador();

        renovador.renovar(sessao("a1", "r1"), anotador);

        assertEquals(CodigosErro.SESSAO_EXPIRADA, anotador.codigo);
    }

    @Test
    public void falhaDefinitivaApagaASessaoEAvisaOsOuvintes() {
        SessaoUsuario velha = sessao("a1", "r1");
        Memoria memoria = new Memoria(velha);
        ServidorManual servidor = new ServidorManual();
        RenovadorSessao renovador = new RenovadorSessao(memoria, servidor, Runnable::run);
        List<String> avisos = new ArrayList<>();
        renovador.adicionarOuvinte(avisos::add);
        Anotador anotador = new Anotador();

        renovador.renovar(velha, anotador);
        servidor.retornos.get(0).aoFalharComCodigo("Sua conta foi bloqueada pela moderação do ACESSO.", CodigosErro.CONTA_BLOQUEADA);

        assertNull(memoria.atual);
        assertEquals(1, avisos.size());
        assertEquals("Sua conta foi bloqueada pela moderação do ACESSO.", avisos.get(0));
        assertEquals(CodigosErro.CONTA_BLOQUEADA, anotador.codigo);
    }

    @Test
    public void falhaPassageiraMantemASessaoEPermiteTentarDeNovo() {
        SessaoUsuario velha = sessao("a1", "r1");
        Memoria memoria = new Memoria(velha);
        ServidorManual servidor = new ServidorManual();
        RenovadorSessao renovador = new RenovadorSessao(memoria, servidor, Runnable::run);
        List<String> avisos = new ArrayList<>();
        renovador.adicionarOuvinte(avisos::add);
        Anotador primeira = new Anotador();

        renovador.renovar(velha, primeira);
        servidor.retornos.get(0).aoFalhar("Sem conexão com a internet.");

        assertEquals("r1", memoria.atual.getTokenRenovacao());
        assertTrue(avisos.isEmpty());
        assertNull(primeira.codigo);
        assertEquals("Sem conexão com a internet.", primeira.mensagem);

        // A próxima tentativa não fica presa em "em andamento".
        renovador.renovar(velha, new Anotador());
        assertEquals(2, servidor.pedidos.size());
    }
}
