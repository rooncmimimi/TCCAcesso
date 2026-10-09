package com.acesso.app.repositorios;

import android.content.Context;

import com.acesso.app.modelos.DadosCadastroEmpresa;
import com.acesso.app.modelos.DadosCadastroPessoa;
import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.ResultadoLogin;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.servicos.ClienteApi;
import com.acesso.app.servicos.ClienteHttp;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.MensagensErro;
import com.acesso.app.servicos.TradutorErrosApi;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.function.Supplier;

import okhttp3.Request;
import okhttp3.RequestBody;

/**
 * Autenticação pela API do Site (Site/Backend, rotas /api/auth em autenticacaoRoutes.js).
 * É o mesmo login do site: as contas ficam na tabela usuarios (com candidatos ou empresas),
 * a senha é guardada com bcrypt no servidor e a sessão é um JWT curto + refresh token rotativo.
 *
 * Os formatos de envio e resposta seguem o código da API (AutenticacaoController e
 * AutenticacaoService). Ainda não foi testado contra a API rodando: veja o passo a passo
 * em docs/PLANEJAMENTO_BACKEND.md.
 */
public class RepositorioAutenticacaoApi implements RepositorioAutenticacao {

    public static final String ORIGEM = "api";

    static final String TIPO_NAO_SUPORTADO =
            "Esta conta é de administração. Use o painel administrativo pelo site.";

    /** Usado só se o token não informar quando expira; a API emite tokens de 30 minutos por padrão. */
    private static final long VALIDADE_PADRAO_MILLIS = 15 * 60 * 1000;

    private final ExecutorHttp executor;
    private final ExecutorHttp executorRenovacao;

    public RepositorioAutenticacaoApi(Context contexto) {
        executor = new ExecutorHttp(contexto, TradutorErrosApi::traduzir);
        // Na renovação, 401/403 significa que a sessão acabou (refresh token revogado ou vencido).
        executorRenovacao = new ExecutorHttp(contexto, (codigo, corpo) -> codigo == 401 || codigo == 403
                ? new FalhaHttp(MensagensErro.SESSAO_EXPIRADA)
                : TradutorErrosApi.traduzir(codigo, corpo));
    }

    /** POST /api/auth/login { email, senha, confirmarReativacao? } */
    @Override
    public void entrar(String email, String senha, boolean confirmarReativacao, RetornoRepositorio<ResultadoLogin> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", email.trim());
        corpo.addProperty("senha", senha);
        if (confirmarReativacao) {
            corpo.addProperty("confirmarReativacao", true);
        }
        executar(executor, post("auth/login", corpo), retorno, RepositorioAutenticacaoApi::lerResultadoLogin);
    }

    /** POST /api/auth/register/candidato { nome, email, senha, telefone?, cpf? } */
    @Override
    public void cadastrarPessoa(DadosCadastroPessoa dados, RetornoRepositorio<ResultadoCadastro> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("nome", dados.nome);
        corpo.addProperty("email", dados.email);
        corpo.addProperty("senha", dados.senha);
        adicionarSePreenchido(corpo, "telefone", dados.telefone);
        adicionarSePreenchido(corpo, "cpf", dados.cpf);
        executar(executor, post("auth/register/candidato", corpo), retorno, RepositorioAutenticacaoApi::lerResultadoCadastro);
    }

    /** POST /api/auth/register/empresa (campos de autenticacaoValidator.validarCadastroEmpresa) */
    @Override
    public void cadastrarEmpresa(DadosCadastroEmpresa dados, RetornoRepositorio<ResultadoCadastro> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("nome", dados.nome);
        corpo.addProperty("email", dados.email);
        corpo.addProperty("senha", dados.senha);
        corpo.addProperty("cnpj", dados.cnpj);
        corpo.addProperty("razaoSocial", dados.razaoSocial);
        adicionarSePreenchido(corpo, "telefone", dados.telefone);
        adicionarSePreenchido(corpo, "nomeFantasia", dados.nomeFantasia);
        adicionarSePreenchido(corpo, "setor", dados.setor);
        adicionarSePreenchido(corpo, "porte", dados.porte);
        adicionarSePreenchido(corpo, "site", dados.site);
        adicionarSePreenchido(corpo, "descricao", dados.descricao);
        adicionarSePreenchido(corpo, "cidade", dados.cidade);
        adicionarSePreenchido(corpo, "estado", dados.estado);
        adicionarSePreenchido(corpo, "endereco", dados.endereco);
        adicionarSePreenchido(corpo, "cep", dados.cep);
        executar(executor, post("auth/register/empresa", corpo), retorno, RepositorioAutenticacaoApi::lerResultadoCadastro);
    }

    /**
     * POST /api/auth/refresh { refreshToken }. A resposta não traz a empresa
     * (só o login e o cadastro trazem), então o status da empresa é mantido.
     */
    @Override
    public void renovarSessao(SessaoUsuario sessao, RetornoRepositorio<SessaoUsuario> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("refreshToken", sessao.getTokenRenovacao());
        executar(executorRenovacao, post("auth/refresh", corpo), retorno,
                json -> lerSessao(json, sessao.getStatusEmpresa()));
    }

    /**
     * POST /api/auth/senha/esqueci { email }. A API manda um e-mail com código e link
     * para a página de redefinição do site (a resposta é sempre genérica).
     */
    @Override
    public void enviarLinkNovaSenha(String email, RetornoRepositorio<Void> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("email", email.trim());
        executar(executor, post("auth/senha/esqueci", corpo), retorno, json -> null);
    }

    /** POST /api/auth/senha/redefinir { token, novaSenha } */
    @Override
    public void alterarSenha(String tokenRecuperacao, String novaSenha, RetornoRepositorio<Void> retorno) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("token", tokenRecuperacao);
        corpo.addProperty("novaSenha", novaSenha);
        executar(executor, post("auth/senha/redefinir", corpo), retorno, json -> null);
    }

    /** POST /api/auth/logout { refreshToken }, com o token de acesso no cabeçalho. */
    @Override
    public void sair(SessaoUsuario sessao) {
        if (!ClienteApi.estaConfigurada()) {
            return;
        }
        JsonObject corpo = new JsonObject();
        corpo.addProperty("refreshToken", sessao.getTokenRenovacao());
        executor.enviarSemResposta(ClienteApi.requisicaoAutenticada("auth/logout", sessao.getTokenAcesso())
                .post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON))
                .build());
    }

    // ---------------------------------------------------------------------
    // Leitura das respostas (estáticos e sem Android, para os testes JUnit)

    /** { usuario, token, refreshToken } | { emailNaoVerificado, email } | { contaPausada } */
    static ResultadoLogin lerResultadoLogin(JsonObject json) {
        if (verdadeiro(json, "emailNaoVerificado")) {
            return ResultadoLogin.emailNaoConfirmado(texto(json, "email"));
        }
        if (verdadeiro(json, "contaPausada")) {
            return ResultadoLogin.contaPausada();
        }
        return ResultadoLogin.autenticado(lerSessao(json, null));
    }

    /** { usuario, token, refreshToken } | { pendenteVerificacaoEmail, email } */
    static ResultadoCadastro lerResultadoCadastro(JsonObject json) {
        if (verdadeiro(json, "pendenteVerificacaoEmail")) {
            return new ResultadoCadastro(null);
        }
        return new ResultadoCadastro(lerSessao(json, null));
    }

    static SessaoUsuario lerSessao(JsonObject json, String statusEmpresaAnterior) {
        JsonObject usuario = json.getAsJsonObject("usuario");
        TipoConta tipo = TipoConta.doCodigo(texto(usuario, "tipoUsuario"));
        if (tipo == null) {
            throw new ExecutorHttp.ErroAmigavel(TIPO_NAO_SUPORTADO);
        }

        String statusEmpresa = statusEmpresaAnterior;
        if (usuario.has("empresa") && usuario.get("empresa").isJsonObject()) {
            statusEmpresa = texto(usuario.getAsJsonObject("empresa"), "statusAprovacao");
        }

        String token = texto(json, "token");
        return new SessaoUsuario(
                texto(usuario, "id"),
                texto(usuario, "email"),
                texto(usuario, "nome"),
                tipo,
                statusEmpresa,
                token,
                texto(json, "refreshToken"),
                lerExpiracaoJwt(token, System.currentTimeMillis()),
                ORIGEM);
    }

    /**
     * Lê o "exp" (segundos) do JWT. Só para saber quando renovar: quem confere a
     * assinatura do token é a API, nunca o app.
     */
    static long lerExpiracaoJwt(String token, long agoraMillis) {
        try {
            String[] partes = token.split("\\.");
            String carga = new String(Base64.getUrlDecoder().decode(partes[1]), StandardCharsets.UTF_8);
            return JsonParser.parseString(carga).getAsJsonObject().get("exp").getAsLong() * 1000;
        } catch (RuntimeException formatoInesperado) {
            return agoraMillis + VALIDADE_PADRAO_MILLIS;
        }
    }

    // ---------------------------------------------------------------------

    /** Montada só em executar(), depois de conferir URL_API (vazia, faria o OkHttp lançar exceção). */
    private static Supplier<Request> post(String caminho, JsonObject corpo) {
        return () -> ClienteApi.requisicao(caminho)
                .post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON))
                .build();
    }

    private static <T> void executar(ExecutorHttp executor, Supplier<Request> requisicao, RetornoRepositorio<T> retorno,
                                     ExecutorHttp.LeitorResposta<T> leitor) {
        if (!ClienteApi.estaConfigurada()) {
            executor.falhar(retorno, new FalhaHttp("O endereço da API ainda não foi configurado (URL_API). Veja o README."));
            return;
        }
        executor.executar(requisicao.get(), retorno, leitor);
    }

    private static void adicionarSePreenchido(JsonObject corpo, String campo, String valor) {
        if (valor != null && !valor.isEmpty()) {
            corpo.addProperty(campo, valor);
        }
    }

    private static boolean verdadeiro(JsonObject json, String chave) {
        return json.has(chave) && json.get(chave).isJsonPrimitive() && json.get(chave).getAsBoolean();
    }

    private static String texto(JsonObject json, String chave) {
        return json.has(chave) && json.get(chave).isJsonPrimitive() ? json.get(chave).getAsString() : null;
    }
}
