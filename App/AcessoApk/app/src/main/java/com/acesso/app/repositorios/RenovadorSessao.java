package com.acesso.app.repositorios;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.servicos.CodigosErro;
import com.acesso.app.servicos.MensagensErro;
import com.acesso.app.utilitarios.GerenciadorSessao;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;

/**
 * Único lugar que renova a sessão do app.
 *
 * Por quê: o refresh token da API é rotativo (a cada renovação o antigo deixa de valer) e,
 * se um token já substituído for reapresentado depois da janela de tolerância, o servidor
 * entende como roubo e derruba todas as sessões da conta (SessaoService.rotacionar). Duas
 * telas renovando ao mesmo tempo poderiam causar isso. Aqui:
 * <ul>
 *   <li>só existe uma renovação em andamento; quem chega durante ela espera o mesmo resultado;</li>
 *   <li>quem chega com uma sessão antiga, quando já existe uma renovada salva, recebe a salva;</li>
 *   <li>falha definitiva (sessão recusada, conta bloqueada, senha alterada) apaga a sessão
 *       salva e avisa os ouvintes; falha passageira (rede, 429, 5xx) não apaga nada.</li>
 * </ul>
 * Todas as respostas chegam pelo {@code Executor} de entrega (a thread principal no app).
 */
public class RenovadorSessao implements ExecutorHttp.ProvedorSessao {

    /** Onde a sessão fica guardada (GerenciadorSessao no app). */
    public interface Armazenamento {
        SessaoUsuario obter();

        void salvar(SessaoUsuario sessao);

        void limpar();
    }

    /** A chamada de renovação ao servidor (RepositorioAutenticacao.renovarSessao no app). */
    public interface Acao {
        void renovar(SessaoUsuario sessao, RetornoRepositorio<SessaoUsuario> retorno);
    }

    /** Avisado quando a sessão acaba de vez; a mensagem é o aviso para a apresentação. */
    public interface Ouvinte {
        void aoEncerrar(String mensagem);
    }

    private static RenovadorSessao global;

    private final Armazenamento armazenamento;
    private final Acao acao;
    private final Executor entrega;
    private final List<Ouvinte> ouvintes = new CopyOnWriteArrayList<>();
    private final List<RetornoRepositorio<SessaoUsuario>> esperando = new ArrayList<>();
    private boolean emAndamento;

    public RenovadorSessao(Armazenamento armazenamento, Acao acao, Executor entrega) {
        this.armazenamento = armazenamento;
        this.acao = acao;
        this.entrega = entrega;
    }

    /** Instância única do app, ligada ao GerenciadorSessao e à fonte de login ativa. */
    public static synchronized RenovadorSessao global(Context contexto) {
        if (global == null) {
            Context aplicacao = contexto.getApplicationContext();
            GerenciadorSessao gerenciador = new GerenciadorSessao(aplicacao);
            global = new RenovadorSessao(
                    new Armazenamento() {
                        @Override
                        public SessaoUsuario obter() {
                            return gerenciador.obter();
                        }

                        @Override
                        public void salvar(SessaoUsuario sessao) {
                            gerenciador.salvar(sessao);
                        }

                        @Override
                        public void limpar() {
                            gerenciador.limpar();
                        }
                    },
                    (sessao, retorno) -> FabricaRepositorios.autenticacao(aplicacao).renovarSessao(sessao, retorno),
                    new Handler(Looper.getMainLooper())::post);
        }
        return global;
    }

    public void adicionarOuvinte(Ouvinte ouvinte) {
        ouvintes.add(ouvinte);
    }

    public void removerOuvinte(Ouvinte ouvinte) {
        ouvintes.remove(ouvinte);
    }

    @Override
    public SessaoUsuario atual() {
        return armazenamento.obter();
    }

    /**
     * Renova a sessão. {@code usada} é a sessão com que o chamador tentou; se a salva já for
     * outra (alguém renovou antes), ela é devolvida sem falar com o servidor.
     */
    @Override
    public void renovar(SessaoUsuario usada, RetornoRepositorio<SessaoUsuario> retorno) {
        // A leitura da sessão salva e a decisão de iniciar uma renovação são uma coisa só: o salvamento
        // do resultado acontece antes de emAndamento voltar a false (ver aoConcluir).
        final SessaoUsuario salva;
        synchronized (this) {
            salva = armazenamento.obter();
            if (salva != null && (usada == null || salva.getTokenRenovacao().equals(usada.getTokenRenovacao()))) {
                esperando.add(retorno);
                if (emAndamento) {
                    return;
                }
                emAndamento = true;
            }
        }
        if (salva == null) {
            entrega.execute(() -> retorno.aoFalharComCodigo(MensagensErro.SESSAO_EXPIRADA, CodigosErro.SESSAO_EXPIRADA));
            return;
        }
        if (usada != null && !salva.getTokenRenovacao().equals(usada.getTokenRenovacao())) {
            // Alguém já renovou: a sessão salva é mais nova que a usada.
            entrega.execute(() -> retorno.aoConcluir(salva));
            return;
        }
        acao.renovar(salva, new RetornoRepositorio<SessaoUsuario>() {
            @Override
            public void aoConcluir(SessaoUsuario renovada) {
                armazenamento.salvar(renovada);
                for (RetornoRepositorio<SessaoUsuario> espera : encerrarAndamento()) {
                    entrega.execute(() -> espera.aoConcluir(renovada));
                }
            }

            @Override
            public void aoFalhar(String mensagem) {
                falhou(mensagem, null);
            }

            @Override
            public void aoFalharComCodigo(String mensagem, String codigo) {
                falhou(mensagem, codigo);
            }
        });
    }

    /** Apaga a sessão salva e avisa os ouvintes (chamado também quando uma requisição autenticada descobre o fim). */
    @Override
    public void encerrar(String codigo, String mensagem) {
        armazenamento.limpar();
        entrega.execute(() -> {
            for (Ouvinte ouvinte : ouvintes) {
                ouvinte.aoEncerrar(mensagem);
            }
        });
    }

    private void falhou(String mensagem, String codigo) {
        if (CodigosErro.encerraSessao(codigo)) {
            encerrar(codigo, mensagem);
        }
        for (RetornoRepositorio<SessaoUsuario> espera : encerrarAndamento()) {
            entrega.execute(() -> {
                if (codigo != null) {
                    espera.aoFalharComCodigo(mensagem, codigo);
                } else {
                    espera.aoFalhar(mensagem);
                }
            });
        }
    }

    private synchronized List<RetornoRepositorio<SessaoUsuario>> encerrarAndamento() {
        List<RetornoRepositorio<SessaoUsuario>> copia = new ArrayList<>(esperando);
        esperando.clear();
        emAndamento = false;
        return copia;
    }
}
