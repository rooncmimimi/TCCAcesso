package com.acesso.app.repositorios;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.acesso.app.servicos.ClienteHttp;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.MensagensErro;
import com.acesso.app.utilitarios.UtilitarioRede;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Envia uma requisição HTTP fora da thread principal e entrega o resultado
 * (ou a falha já traduzida) de volta na thread principal. Usado pelos
 * repositórios do Supabase e da API do Site, para os dois tratarem
 * internet, tempo esgotado e respostas de erro do mesmo jeito.
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

    /** Lançado pelo LeitorResposta quando a resposta é "sucesso" mas representa um erro de regra de negócio. */
    static class ErroAmigavel extends RuntimeException {
        ErroAmigavel(String mensagem) {
            super(mensagem);
        }
    }

    private final Context contexto;
    private final TradutorErros tradutor;
    private final Handler threadPrincipal = new Handler(Looper.getMainLooper());

    ExecutorHttp(Context contexto, TradutorErros tradutor) {
        this.contexto = contexto.getApplicationContext();
        this.tradutor = tradutor;
    }

    <T> void executar(Request requisicao, RetornoRepositorio<T> retorno, LeitorResposta<T> leitor) {
        if (!UtilitarioRede.estaConectado(contexto)) {
            falhar(retorno, new FalhaHttp(MensagensErro.SEM_INTERNET));
            return;
        }

        ClienteHttp.http().newCall(requisicao).enqueue(new Callback() {
            @Override
            public void onFailure(Call chamada, IOException erro) {
                falhar(retorno, new FalhaHttp(MensagensErro.SERVIDOR_INACESSIVEL));
            }

            @Override
            public void onResponse(Call chamada, Response resposta) {
                try (ResponseBody corpoResposta = resposta.body()) {
                    String texto = corpoResposta != null ? corpoResposta.string() : "";
                    if (!resposta.isSuccessful()) {
                        falhar(retorno, tradutor.traduzir(resposta.code(), texto));
                        return;
                    }
                    JsonObject json = texto.isEmpty()
                            ? new JsonObject()
                            : JsonParser.parseString(texto).getAsJsonObject();
                    T resultado = leitor.ler(json);
                    threadPrincipal.post(() -> retorno.aoConcluir(resultado));
                } catch (ErroAmigavel erro) {
                    falhar(retorno, new FalhaHttp(erro.getMessage()));
                } catch (IOException | RuntimeException erro) {
                    falhar(retorno, new FalhaHttp(MensagensErro.ERRO_GENERICO));
                }
            }
        });
    }

    /** Envia sem esperar resposta (ex.: sair da conta, que apaga a sessão local de qualquer jeito). */
    void enviarSemResposta(Request requisicao) {
        ClienteHttp.http().newCall(requisicao).enqueue(new Callback() {
            @Override
            public void onFailure(Call chamada, IOException erro) {
            }

            @Override
            public void onResponse(Call chamada, Response resposta) {
                resposta.close();
            }
        });
    }

    static <T> void falharNaThreadPrincipal(Handler threadPrincipal, RetornoRepositorio<T> retorno, FalhaHttp falha) {
        threadPrincipal.post(() -> {
            if (falha.getErrosCampos().isEmpty()) {
                retorno.aoFalhar(falha.getMensagem());
            } else {
                retorno.aoFalharComCampos(falha.getMensagem(), falha.getErrosCampos());
            }
        });
    }

    <T> void falhar(RetornoRepositorio<T> retorno, FalhaHttp falha) {
        falharNaThreadPrincipal(threadPrincipal, retorno, falha);
    }
}
