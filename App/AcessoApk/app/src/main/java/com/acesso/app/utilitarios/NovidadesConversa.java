package com.acesso.app.utilitarios;

import com.acesso.app.modelos.Mensagem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * O que mudou numa conversa aberta desde a última vez que a lista foi mostrada. A TelaConversa
 * redesenha a lista a cada atualização (5 s), então precisa saber se chegou mensagem para descer até
 * o fim e, principalmente, para o TalkBack avisar quem não está olhando a tela que a outra pessoa
 * respondeu.
 *
 * Compara pelos ids, não pela quantidade: a tela guarda só as duas últimas páginas da conversa, então
 * o total pode até diminuir quando chega mensagem (a página nova começa e a mais antiga sai).
 * Não depende do Android (testado em NovidadesConversaTeste).
 */
public final class NovidadesConversa {

    /** Resultado de uma atualização da lista. */
    public static final class Novidades {
        /** Apareceu alguma mensagem que ainda não estava na tela (inclusive na primeira carga). */
        public final boolean chegouMensagem;
        /** Mensagens da outra pessoa que chegaram com a conversa já aberta, na ordem de envio. */
        public final List<Mensagem> recebidas;

        Novidades(boolean chegouMensagem, List<Mensagem> recebidas) {
            this.chegouMensagem = chegouMensagem;
            this.recebidas = recebidas;
        }
    }

    private final Set<String> vistas = new HashSet<>();
    private boolean jaMostrou;

    /**
     * Registra a lista que vai ser mostrada agora. Na primeira carga nada é "recebido": a pessoa acabou de
     * abrir a conversa e vai ler o histórico, não precisa de aviso.
     */
    public Novidades registrar(List<Mensagem> mensagens, String meuId) {
        if (mensagens == null || mensagens.isEmpty()) {
            return new Novidades(false, Collections.emptyList());
        }
        boolean primeira = !jaMostrou;
        jaMostrou = true;
        boolean chegou = false;
        List<Mensagem> recebidas = new ArrayList<>();
        for (Mensagem mensagem : mensagens) {
            // Sem id não há como saber se é nova; conta como já vista para não avisar à toa.
            if (mensagem.id == null || !vistas.add(mensagem.id)) {
                continue;
            }
            chegou = true;
            boolean minha = mensagem.remetenteId != null && mensagem.remetenteId.equalsIgnoreCase(meuId);
            if (!primeira && !minha) {
                recebidas.add(mensagem);
            }
        }
        return new Novidades(chegou || primeira, recebidas);
    }
}
