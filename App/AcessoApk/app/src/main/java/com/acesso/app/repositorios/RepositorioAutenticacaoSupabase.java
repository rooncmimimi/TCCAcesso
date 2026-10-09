package com.acesso.app.repositorios;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.DadosCadastroEmpresa;
import com.acesso.app.modelos.DadosCadastroPessoa;
import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.ResultadoLogin;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.servicos.ClienteHttp;
import com.acesso.app.servicos.ClienteSupabase;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.TradutorErrosSupabase;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import okhttp3.Request;
import okhttp3.RequestBody;

/**
 * Autenticação pelo Supabase Auth: entrar, criar conta, recuperar senha,
 * renovar a sessão e sair. Contas criadas aqui são sempre de pessoa:
 * o Supabase do app não tem tabela de empresas (veja supabase/001_perfis.sql).
 *
 * Os nomes dos campos JSON enviados (email, password, refresh_token...) são
 * os que a API do Supabase exige, por isso ficam em inglês.
 */
public class RepositorioAutenticacaoSupabase implements RepositorioAutenticacao {

    /** Endereço que o link do e-mail de recuperação abre no aparelho (ver AndroidManifest). */
    public static final String ENDERECO_NOVA_SENHA = "acesso://redefinir-senha";
    public static final String ORIGEM = "supabase";

    static final String EMPRESA_INDISPONIVEL =
            "O cadastro de empresas ainda depende da integração do app com a API do ACESSO. "
                    + "Por enquanto, cadastre a empresa pelo site.";

    private final ExecutorHttp executor;
    private final Handler threadPrincipal = new Handler(Looper.getMainLooper());

    public RepositorioAutenticacaoSupabase(Context contexto) {
        executor = new ExecutorHttp(contexto,
                (codigo, corpo) -> new FalhaHttp(TradutorErrosSupabase.traduzir(codigo, corpo)));
    }

    @Override
    public void entrar(String email, String senha, boolean confirmarReativacao, RetornoRepositorio<ResultadoLogin> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", email.trim());
        corpo.addProperty("password", senha);

        Request requisicao = ClienteSupabase.requisicao(ClienteSupabase.urlAutenticacao("token?grant_type=password"))
                .post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON))
                .build();

        // No Supabase, e-mail não confirmado vem como erro (email_not_confirmed) e já é traduzido.
        executar(requisicao, retorno, json -> ResultadoLogin.autenticado(lerSessao(json)));
    }

    /**
     * Cria a conta no Supabase Auth. Nome, cidade, data de nascimento e aceite dos
     * termos vão juntos em "data"; um gatilho no banco usa esses dados para criar
     * a linha em perfis com o mesmo UUID (ver supabase/001_perfis.sql).
     * Telefone e CPF não têm coluna em perfis e não são enviados.
     */
    @Override
    public void cadastrarPessoa(DadosCadastroPessoa dados, RetornoRepositorio<ResultadoCadastro> retorno) {
        JsonObject dadosPerfil = new JsonObject();
        dadosPerfil.addProperty("nome", dados.nome);
        dadosPerfil.addProperty("cidade", dados.cidade);
        if (dados.dataNascimentoIso != null) {
            dadosPerfil.addProperty("data_nascimento", dados.dataNascimentoIso);
        }
        dadosPerfil.addProperty("aceitou_termos", dados.aceitouTermos);

        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", dados.email);
        corpo.addProperty("password", dados.senha);
        corpo.add("data", dadosPerfil);

        Request requisicao = ClienteSupabase.requisicao(ClienteSupabase.urlAutenticacao("signup"))
                .post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON))
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
                throw new ExecutorHttp.ErroAmigavel(
                        TradutorErrosSupabase.traduzir(422, "{\"error_code\":\"user_already_exists\"}"));
            }
            return new ResultadoCadastro(null);
        });
    }

    @Override
    public void cadastrarEmpresa(DadosCadastroEmpresa dados, RetornoRepositorio<ResultadoCadastro> retorno) {
        threadPrincipal.post(() -> retorno.aoFalhar(EMPRESA_INDISPONIVEL));
    }

    @Override
    public void enviarLinkNovaSenha(String email, RetornoRepositorio<Void> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", email.trim());

        Request requisicao = ClienteSupabase.requisicao(
                        ClienteSupabase.urlAutenticacao("recover?redirect_to=" + ENDERECO_NOVA_SENHA))
                .post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON))
                .build();

        executar(requisicao, retorno, json -> null);
    }

    @Override
    public void alterarSenha(String tokenRecuperacao, String novaSenha, RetornoRepositorio<Void> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("password", novaSenha);

        Request requisicao = ClienteSupabase.requisicaoAutenticada(ClienteSupabase.urlAutenticacao("user"), tokenRecuperacao)
                .put(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON))
                .build();

        executar(requisicao, retorno, json -> null);
    }

    @Override
    public void renovarSessao(SessaoUsuario sessao, RetornoRepositorio<SessaoUsuario> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("refresh_token", sessao.getTokenRenovacao());

        Request requisicao = ClienteSupabase.requisicao(ClienteSupabase.urlAutenticacao("token?grant_type=refresh_token"))
                .post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON))
                .build();

        executar(requisicao, retorno, RepositorioAutenticacaoSupabase::lerSessao);
    }

    @Override
    public void sair(SessaoUsuario sessao) {
        if (!ClienteSupabase.estaConfigurado()) {
            return;
        }
        Request requisicao = ClienteSupabase.requisicaoAutenticada(ClienteSupabase.urlAutenticacao("logout"), sessao.getTokenAcesso())
                .post(RequestBody.create("{}", ClienteHttp.TIPO_JSON))
                .build();
        executor.enviarSemResposta(requisicao);
    }

    // ---------------------------------------------------------------------

    private <T> void executar(Request requisicao, RetornoRepositorio<T> retorno, ExecutorHttp.LeitorResposta<T> leitor) {
        if (!ClienteSupabase.estaConfigurado()) {
            executor.falhar(retorno, new FalhaHttp("O app ainda não foi configurado com o Supabase. Veja o README."));
            return;
        }
        executor.executar(requisicao, retorno, leitor);
    }

    private static SessaoUsuario lerSessao(JsonObject json) {
        JsonObject usuario = json.getAsJsonObject("user");
        long expiraEmMillis = json.has("expires_at")
                ? json.get("expires_at").getAsLong() * 1000
                : System.currentTimeMillis() + json.get("expires_in").getAsLong() * 1000;
        String nome = null;
        if (usuario.has("user_metadata") && usuario.get("user_metadata").isJsonObject()) {
            JsonObject metadados = usuario.getAsJsonObject("user_metadata");
            if (metadados.has("nome") && metadados.get("nome").isJsonPrimitive()) {
                nome = metadados.get("nome").getAsString();
            }
        }
        return new SessaoUsuario(
                usuario.get("id").getAsString(),
                usuario.has("email") && !usuario.get("email").isJsonNull() ? usuario.get("email").getAsString() : null,
                nome,
                TipoConta.PESSOA,
                null,
                json.get("access_token").getAsString(),
                json.get("refresh_token").getAsString(),
                expiraEmMillis,
                ORIGEM);
    }
}
