package com.acesso.app.repositorios;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.servicos.ClienteHttp;
import com.acesso.app.servicos.CodigosErro;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.MensagensErro;
import com.acesso.app.utilitarios.UtilitarioRede;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.util.concurrent.Executor;
import java.util.function.BooleanSupplier;
import java.util.function.Function;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Envia uma requisição HTTP fora da thread principal e entrega o resultado
 * (ou a falha já traduzida) de volta na thread principal. Usado pelos
 * repositórios do Supabase e da API do Site, para os dois tratarem
 * internet, tempo esgotado e respostas de erro do mesmo jeito.
 *
 * Com um {@link ProvedorSessao}, também envia requisições em nome do usuário logado
 * ({@link #executarComSessao}): renova o token vencido antes de enviar e, se a API
 * responder 401, renova uma vez e repete.
 */
class ExecutorHttp {

    /** Converte o JSON de uma resposta de sucesso no resultado da operação. */
    interface LeitorResposta<T> {
        T ler(JsonObject json);
    }

    /** Converte uma resposta de erro (status HTTP + corpo) em mensagem para o usuário. */
    interface TradutorErros {
        FalhaHttp traduzir(int codigoHttp, String corpo);
    }

    /** De onde vem a sessão atual e como renová-la ou encerrá-la (implementado por {@link RenovadorSessao}). */
    interface ProvedorSessao {
        SessaoUsuario atual();

        /** Renova a sessão; {@code usada} é a sessão com que a chamada falhou ou venceu. */
        void renovar(SessaoUsuario usada, RetornoRepositorio<SessaoUsuario> retorno);

        /** A sessão acabou de vez (conta bloqueada, senha alterada, sessão recusada): apaga e avisa as telas. */
        void encerrar(String codigo, String mensagem);
    }

    /** Lançado pelo LeitorResposta quando a resposta é "sucesso" mas representa um erro de regra de negócio. */
    static class ErroAmigavel extends RuntimeException {
        ErroAmigavel(String mensagem) {
            super(mensagem);
        }
    }

    private final OkHttpClient cliente;
    private final Executor entrega;
    private final BooleanSupplier conectado;
    private final TradutorErros tradutor;
    private final ProvedorSessao provedorSessao;

    ExecutorHttp(Context contexto, TradutorErros tradutor) {
        this(contexto, tradutor, null);
    }

    ExecutorHttp(Context contexto, TradutorErros tradutor, ProvedorSessao provedorSessao) {
        this(ClienteHttp.http(), new Handler(Looper.getMainLooper())::post,
                () -> UtilitarioRede.estaConectado(contexto.getApplicationContext()), tradutor, provedorSessao);
    }

    /** Construtor sem Android, para os testes JUnit. */
    ExecutorHttp(OkHttpClient cliente, Executor entrega, BooleanSupplier conectado, TradutorErros tradutor,
                 ProvedorSessao provedorSessao) {
        this.cliente = cliente;
        this.entrega = entrega;
        this.conectado = conectado;
        this.tradutor = tradutor;
        this.provedorSessao = provedorSessao;
    }

    <T> void executar(Request requisicao, RetornoRepositorio<T> retorno, LeitorResposta<T> leitor) {
        if (!conectado.getAsBoolean()) {
            falhar(retorno, new FalhaHttp(MensagensErro.SEM_INTERNET));
            return;
        }
        cliente.newCall(requisicao).enqueue(new Callback() {
            @Override
            public void onFailure(Call chamada, IOException erro) {
                falhar(retorno, new FalhaHttp(MensagensErro.SERVIDOR_INACESSIVEL));
            }

            @Override
            public void onResponse(Call chamada, Response resposta) {
                tratarResposta(resposta, retorno, leitor, null);
            }
        });
    }

    /**
     * Requisição em nome do usuário logado. {@code montar} recebe o token de acesso e devolve
     * a requisição (chamado de novo, com o token novo, se for preciso repetir).
     *
     * <ul>
     *   <li>Sem sessão salva: falha com SESSAO_EXPIRADA.</li>
     *   <li>Token vencido (ou a menos de 1 minuto): renova antes de enviar.</li>
     *   <li>Resposta 401: renova uma vez e repete. Se ainda for 401, a sessão é encerrada.</li>
     *   <li>CONTA_BLOQUEADA ou SENHA_ALTERADA: encerra a sessão, sem tentar renovar.</li>
     *   <li>Falha de rede, 429 e 5xx na renovação não encerram a sessão.</li>
     * </ul>
     */
    <T> void executarComSessao(Function<String, Request> montar, RetornoRepositorio<T> retorno, LeitorResposta<T> leitor) {
        if (provedorSessao == null) {
            throw new IllegalStateException("ExecutorHttp criado sem ProvedorSessao.");
        }
        if (!conectado.getAsBoolean()) {
            falhar(retorno, new FalhaHttp(MensagensErro.SEM_INTERNET));
            return;
        }
        SessaoUsuario sessao = provedorSessao.atual();
        if (sessao == null) {
            falhar(retorno, new FalhaHttp(MensagensErro.SESSAO_EXPIRADA, null, 401, CodigosErro.SESSAO_EXPIRADA));
            return;
        }
        if (sessao.estaExpirada(System.currentTimeMillis())) {
            renovarEEnviar(sessao, montar, retorno, leitor);
        } else {
            enviarComSessao(sessao, false, montar, retorno, leitor);
        }
    }

    private <T> void renovarEEnviar(SessaoUsuario usada, Function<String, Request> montar,
                                    RetornoRepositorio<T> retorno, LeitorResposta<T> leitor) {
        provedorSessao.renovar(usada, new RetornoRepositorio<SessaoUsuario>() {
            @Override
            public void aoConcluir(SessaoUsuario renovada) {
                enviarComSessao(renovada, true, montar, retorno, leitor);
            }

            @Override
            public void aoFalhar(String mensagem) {
                falhar(retorno, new FalhaHttp(mensagem));
            }

            @Override
            public void aoFalharComCodigo(String mensagem, String codigo) {
                falhar(retorno, new FalhaHttp(mensagem, null, 0, codigo));
            }
        });
    }

    private <T> void enviarComSessao(SessaoUsuario sessao, boolean jaRenovou, Function<String, Request> montar,
                                     RetornoRepositorio<T> retorno, LeitorResposta<T> leitor) {
        Request requisicao = montar.apply(sessao.getTokenAcesso());
        cliente.newCall(requisicao).enqueue(new Callback() {
            @Override
            public void onFailure(Call chamada, IOException erro) {
                falhar(retorno, new FalhaHttp(MensagensErro.SERVIDOR_INACESSIVEL));
            }

            @Override
            public void onResponse(Call chamada, Response resposta) {
                tratarResposta(resposta, retorno, leitor, falha -> {
                    String codigo = falha.getCodigoErro();
                    if (CodigosErro.encerraSessao(codigo)) {
                        // Conta bloqueada ou senha alterada: renovar não adianta.
                        provedorSessao.encerrar(codigo, falha.getMensagem());
                        return falha;
                    }
                    if (falha.getCodigoHttp() != 401) {
                        return falha;
                    }
                    if (jaRenovou) {
                        // O token recém-renovado também foi recusado: a sessão não vale mais.
                        provedorSessao.encerrar(CodigosErro.SESSAO_EXPIRADA, MensagensErro.SESSAO_EXPIRADA);
                        return new FalhaHttp(MensagensErro.SESSAO_EXPIRADA, null, 401, CodigosErro.SESSAO_EXPIRADA);
                    }
                    renovarEEnviar(sessao, montar, retorno, leitor);
                    return null;
                });
            }
        });
    }

    /** Decide o que fazer com uma falha de resposta: devolve a falha a entregar, ou null se já tratou (repetiu a chamada). */
    private interface TratadorFalha {
        FalhaHttp tratar(FalhaHttp falha);
    }

    private <T> void tratarResposta(Response resposta, RetornoRepositorio<T> retorno, LeitorResposta<T> leitor,
                                    TratadorFalha tratadorFalha) {
        try (ResponseBody corpoResposta = resposta.body()) {
            String texto = corpoResposta != null ? corpoResposta.string() : "";
            if (!resposta.isSuccessful()) {
                FalhaHttp falha = comStatus(tradutor.traduzir(resposta.code(), texto), resposta.code());
                if (tratadorFalha != null) {
                    falha = tratadorFalha.tratar(falha);
                }
                if (falha != null) {
                    falhar(retorno, falha);
                }
                return;
            }
            JsonObject json = texto.isEmpty()
                    ? new JsonObject()
                    : JsonParser.parseString(texto).getAsJsonObject();
            T resultado = leitor.ler(json);
            entrega.execute(() -> retorno.aoConcluir(resultado));
        } catch (ErroAmigavel erro) {
            falhar(retorno, new FalhaHttp(erro.getMessage()));
        } catch (IOException | RuntimeException erro) {
            falhar(retorno, new FalhaHttp(MensagensErro.ERRO_GENERICO));
        }
    }

    /** Garante o status HTTP na falha mesmo quando o tradutor (ex.: do Supabase) não o preenche. */
    private static FalhaHttp comStatus(FalhaHttp falha, int codigoHttp) {
        if (falha.getCodigoHttp() != 0) {
            return falha;
        }
        return new FalhaHttp(falha.getMensagem(), falha.getErrosCampos(), codigoHttp, falha.getCodigoErro());
    }

    /** Envia sem esperar resposta (ex.: sair da conta, que apaga a sessão local de qualquer jeito). */
    void enviarSemResposta(Request requisicao) {
        cliente.newCall(requisicao).enqueue(new Callback() {
            @Override
            public void onFailure(Call chamada, IOException erro) {
            }

            @Override
            public void onResponse(Call chamada, Response resposta) {
                resposta.close();
            }
        });
    }

    static <T> void entregarFalha(RetornoRepositorio<T> retorno, FalhaHttp falha) {
        if (!falha.getErrosCampos().isEmpty()) {
            retorno.aoFalharComCampos(falha.getMensagem(), falha.getErrosCampos());
        } else if (falha.getCodigoErro() != null) {
            retorno.aoFalharComCodigo(falha.getMensagem(), falha.getCodigoErro());
        } else {
            retorno.aoFalhar(falha.getMensagem());
        }
    }

    <T> void falhar(RetornoRepositorio<T> retorno, FalhaHttp falha) {
        entrega.execute(() -> entregarFalha(retorno, falha));
    }
}
