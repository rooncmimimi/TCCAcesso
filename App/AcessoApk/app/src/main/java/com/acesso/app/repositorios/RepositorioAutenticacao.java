package com.acesso.app.repositorios;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.servicos.ClienteSupabase;
import com.acesso.app.servicos.TradutorErrosSupabase;
import com.acesso.app.utilitarios.UtilitarioRede;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Toda a comunicação com o Supabase Auth: entrar, criar conta, recuperar
 * senha, renovar a sessão e sair. As telas não chamam o Supabase direto.
 *
 * Os nomes dos campos JSON enviados (email, password, refresh_token...) são
 * os que a API do Supabase exige, por isso ficam em inglês.
 */
public class RepositorioAutenticacao {

    /** Endereço que o link do e-mail de recuperação abre no aparelho (ver AndroidManifest). */
    public static final String ENDERECO_NOVA_SENHA = "acesso://redefinir-senha";

    private final Context contexto;
    private final Handler threadPrincipal = new Handler(Looper.getMainLooper());

    public RepositorioAutenticacao(Context contexto) {
        this.contexto = contexto.getApplicationContext();
    }

    public void entrar(String email, String senha, RetornoRepositorio<SessaoUsuario> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", email.trim());
        corpo.addProperty("password", senha);

        Request requisicao = ClienteSupabase.requisicao(ClienteSupabase.urlAutenticacao("token?grant_type=password"))
                .post(RequestBody.create(corpo.toString(), ClienteSupabase.TIPO_JSON))
                .build();

        executar(requisicao, retorno, RepositorioAutenticacao::lerSessao);
    }

    /**
     * Cria a conta no Supabase Auth. Nome, cidade, data de nascimento e aceite dos
     * termos vão juntos em "data"; um gatilho no banco usa esses dados para criar
     * a linha em perfis com o mesmo UUID (ver supabase/001_perfis.sql).
     *
     * @param dataNascimentoIso data no formato aaaa-mm-dd, ou null se não informada.
     */
    public void cadastrar(String nome, String email, String senha, String cidade,
                          String dataNascimentoIso, RetornoRepositorio<ResultadoCadastro> retorno) {
        JsonObject dadosPerfil = new JsonObject();
        dadosPerfil.addProperty("nome", nome.trim());
        dadosPerfil.addProperty("cidade", cidade.trim());
        if (dataNascimentoIso != null) {
            dadosPerfil.addProperty("data_nascimento", dataNascimentoIso);
        }
        dadosPerfil.addProperty("aceitou_termos", true);

        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", email.trim());
        corpo.addProperty("password", senha);
        corpo.add("data", dadosPerfil);

        Request requisicao = ClienteSupabase.requisicao(ClienteSupabase.urlAutenticacao("signup"))
                .post(RequestBody.create(corpo.toString(), ClienteSupabase.TIPO_JSON))
                .build();

        executar(requisicao, retorno, json -> {
            if (json.has("access_token")) {
                return new ResultadoCadastro(lerSessao(json));
            }
            // Com a confirmação de e-mail ligada, o Supabase devolve só o usuário.
            // Se o e-mail já existe, ele devolve um usuário "falso" sem identities,
            // para não revelar quem tem conta; tratamos isso como e-mail já cadastrado.
            JsonArray identidades = json.has("identities") && json.get("identities").isJsonArray()
                    ? json.getAsJsonArray("identities") : null;
            if (identidades != null && identidades.isEmpty()) {
                throw new ErroAmigavel(TradutorErrosSupabase.traduzir(422, "{\"error_code\":\"user_already_exists\"}"));
            }
            return new ResultadoCadastro(null);
        });
    }

    public void enviarLinkNovaSenha(String email, RetornoRepositorio<Void> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", email.trim());

        Request requisicao = ClienteSupabase.requisicao(
                        ClienteSupabase.urlAutenticacao("recover?redirect_to=" + ENDERECO_NOVA_SENHA))
                .post(RequestBody.create(corpo.toString(), ClienteSupabase.TIPO_JSON))
                .build();

        executar(requisicao, retorno, json -> null);
    }

    /** Troca a senha usando o token que veio no link de recuperação. */
    public void alterarSenha(String tokenAcesso, String novaSenha, RetornoRepositorio<Void> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("password", novaSenha);

        Request requisicao = ClienteSupabase.requisicaoAutenticada(ClienteSupabase.urlAutenticacao("user"), tokenAcesso)
                .put(RequestBody.create(corpo.toString(), ClienteSupabase.TIPO_JSON))
                .build();

        executar(requisicao, retorno, json -> null);
    }

    public void renovarSessao(String tokenRenovacao, RetornoRepositorio<SessaoUsuario> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("refresh_token", tokenRenovacao);

        Request requisicao = ClienteSupabase.requisicao(ClienteSupabase.urlAutenticacao("token?grant_type=refresh_token"))
                .post(RequestBody.create(corpo.toString(), ClienteSupabase.TIPO_JSON))
                .build();

        executar(requisicao, retorno, RepositorioAutenticacao::lerSessao);
    }

    /** Invalida a sessão no Supabase. Mesmo se falhar (ex.: sem internet), o app apaga a sessão local. */
    public void sair(String tokenAcesso) {
        Request requisicao = ClienteSupabase.requisicaoAutenticada(ClienteSupabase.urlAutenticacao("logout"), tokenAcesso)
                .post(RequestBody.create("{}", ClienteSupabase.TIPO_JSON))
                .build();
        ClienteSupabase.http().newCall(requisicao).enqueue(new Callback() {
            @Override
            public void onFailure(Call chamada, IOException erro) {
            }

            @Override
            public void onResponse(Call chamada, Response resposta) {
                resposta.close();
            }
        });
    }

    // ---------------------------------------------------------------------

    private interface LeitorResposta<T> {
        T ler(JsonObject json);
    }

    /** Erro de regra de negócio cuja mensagem já está pronta para o usuário. */
    private static class ErroAmigavel extends RuntimeException {
        ErroAmigavel(String mensagem) {
            super(mensagem);
        }
    }

    private <T> void executar(Request requisicao, RetornoRepositorio<T> retorno, LeitorResposta<T> leitor) {
        if (!ClienteSupabase.estaConfigurado()) {
            avisarFalha(retorno, "O app ainda não foi configurado com o Supabase. Veja o README.");
            return;
        }
        if (!UtilitarioRede.estaConectado(contexto)) {
            avisarFalha(retorno, TradutorErrosSupabase.SEM_INTERNET);
            return;
        }

        ClienteSupabase.http().newCall(requisicao).enqueue(new Callback() {
            @Override
            public void onFailure(Call chamada, IOException erro) {
                avisarFalha(retorno, TradutorErrosSupabase.SERVIDOR_INACESSIVEL);
            }

            @Override
            public void onResponse(Call chamada, Response resposta) {
                try (ResponseBody corpoResposta = resposta.body()) {
                    String texto = corpoResposta != null ? corpoResposta.string() : "";
                    if (!resposta.isSuccessful()) {
                        avisarFalha(retorno, TradutorErrosSupabase.traduzir(resposta.code(), texto));
                        return;
                    }
                    JsonObject json = texto.isEmpty()
                            ? new JsonObject()
                            : JsonParser.parseString(texto).getAsJsonObject();
                    T resultado = leitor.ler(json);
                    threadPrincipal.post(() -> retorno.aoConcluir(resultado));
                } catch (ErroAmigavel erro) {
                    avisarFalha(retorno, erro.getMessage());
                } catch (IOException | RuntimeException erro) {
                    avisarFalha(retorno, TradutorErrosSupabase.ERRO_GENERICO);
                }
            }
        });
    }

    private <T> void avisarFalha(RetornoRepositorio<T> retorno, String mensagem) {
        threadPrincipal.post(() -> retorno.aoFalhar(mensagem));
    }

    private static SessaoUsuario lerSessao(JsonObject json) {
        JsonObject usuario = json.getAsJsonObject("user");
        long expiraEmMillis = json.has("expires_at")
                ? json.get("expires_at").getAsLong() * 1000
                : System.currentTimeMillis() + json.get("expires_in").getAsLong() * 1000;
        return new SessaoUsuario(
                usuario.get("id").getAsString(),
                usuario.has("email") && !usuario.get("email").isJsonNull() ? usuario.get("email").getAsString() : null,
                json.get("access_token").getAsString(),
                json.get("refresh_token").getAsString(),
                expiraEmMillis);
    }
}
