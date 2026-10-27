package com.acesso.app.utilitarios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.Mensagem;

import org.junit.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class NovidadesConversaTeste {

    private static final String EU = "u-eu";
    private static final String OUTRO = "u-outro";

    private static Mensagem mensagem(String id, String remetente) {
        Mensagem mensagem = new Mensagem();
        mensagem.id = id;
        mensagem.remetenteId = remetente;
        mensagem.conteudo = "texto " + id;
        return mensagem;
    }

    /** Ao abrir a conversa a pessoa vai ler o histórico: desce até o fim, mas nada é anunciado. */
    @Test
    public void primeiraCargaDesceMasNaoAnuncia() {
        NovidadesConversa novidades = new NovidadesConversa();
        NovidadesConversa.Novidades resultado = novidades.registrar(
                Arrays.asList(mensagem("1", OUTRO), mensagem("2", EU)), EU);
        assertTrue(resultado.chegouMensagem);
        assertTrue(resultado.recebidas.isEmpty());
    }

    @Test
    public void atualizacaoSemNadaNovoNaoMexeEmNada() {
        NovidadesConversa novidades = new NovidadesConversa();
        List<Mensagem> lista = Arrays.asList(mensagem("1", OUTRO), mensagem("2", EU));
        novidades.registrar(lista, EU);
        NovidadesConversa.Novidades resultado = novidades.registrar(lista, EU);
        assertFalse(resultado.chegouMensagem);
        assertTrue(resultado.recebidas.isEmpty());
    }

    @Test
    public void respostaDaOutraPessoaEAnunciada() {
        NovidadesConversa novidades = new NovidadesConversa();
        novidades.registrar(Arrays.asList(mensagem("1", OUTRO), mensagem("2", EU)), EU);
        NovidadesConversa.Novidades resultado = novidades.registrar(
                Arrays.asList(mensagem("1", OUTRO), mensagem("2", EU), mensagem("3", OUTRO), mensagem("4", OUTRO)), EU);
        assertTrue(resultado.chegouMensagem);
        assertEquals(2, resultado.recebidas.size());
        assertEquals("4", resultado.recebidas.get(1).id);
    }

    /** A própria mensagem desce a lista, mas não vira aviso (a pessoa acabou de escrever). */
    @Test
    public void mensagemPropriaDesceSemAnunciar() {
        NovidadesConversa novidades = new NovidadesConversa();
        novidades.registrar(Arrays.asList(mensagem("1", OUTRO)), EU);
        NovidadesConversa.Novidades resultado = novidades.registrar(
                Arrays.asList(mensagem("1", OUTRO), mensagem("2", EU.toUpperCase())), EU);
        assertTrue(resultado.chegouMensagem);
        assertTrue(resultado.recebidas.isEmpty());
    }

    /**
     * A tela guarda só as duas últimas páginas: quando a última enche e começa outra, a lista fica menor
     * mesmo com mensagem nova. Contar itens não perceberia; comparar ids percebe.
     */
    @Test
    public void percebeMensagemNovaMesmoQuandoAListaDiminui() {
        NovidadesConversa novidades = new NovidadesConversa();
        List<Mensagem> cheia = new ArrayList<>();
        for (int i = 1; i <= 100; i++) {
            cheia.add(mensagem("m" + i, i % 2 == 0 ? EU : OUTRO));
        }
        novidades.registrar(cheia, EU);

        List<Mensagem> menor = new ArrayList<>(cheia.subList(50, 100));
        menor.add(mensagem("m101", OUTRO));
        NovidadesConversa.Novidades resultado = novidades.registrar(menor, EU);

        assertTrue(resultado.chegouMensagem);
        assertEquals(1, resultado.recebidas.size());
        assertEquals("m101", resultado.recebidas.get(0).id);
    }

    @Test
    public void listaVaziaOuSemIdNaoAvisa() {
        NovidadesConversa novidades = new NovidadesConversa();
        assertFalse(novidades.registrar(new ArrayList<>(), EU).chegouMensagem);
        novidades.registrar(Arrays.asList(mensagem("1", OUTRO)), EU);
        NovidadesConversa.Novidades resultado = novidades.registrar(
                Arrays.asList(mensagem("1", OUTRO), mensagem(null, OUTRO)), EU);
        assertFalse(resultado.chegouMensagem);
        assertTrue(resultado.recebidas.isEmpty());
    }
}
