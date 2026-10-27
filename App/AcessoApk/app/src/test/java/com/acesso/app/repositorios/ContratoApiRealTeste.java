package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeNotNull;
import static org.junit.Assume.assumeTrue;

import com.acesso.app.modelos.Candidatura;
import com.acesso.app.modelos.Comentario;
import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.DadosCadastroEmpresa;
import com.acesso.app.modelos.DadosCadastroPessoa;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.Notificacao;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.ResultadoLogin;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.servicos.ClienteHttp;
import com.acesso.app.servicos.CodigosErro;
import com.acesso.app.servicos.FalhaHttp;
import com.acesso.app.servicos.TradutorErrosApi;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runners.MethodSorters;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Contrato do app com uma API do ACESSO de verdade (Site/Backend rodando com PostgreSQL), usando o
 * mesmo código que o app usa: os corpos {@code corpo*} e leitores {@code ler*} da autenticação e os
 * repositórios de conteúdo, social, mensagens e notificações. Diferente dos outros testes, que usam
 * o ServidorFalso, aqui é a API real quem responde.
 *
 * <p>Só roda quando {@code ACESSO_API_TESTE_URL} aponta para uma API de teste (ex.:
 * {@code http://127.0.0.1:3000/api/}); sem a variável, os testes são ignorados e o CI não muda.
 * <b>Cria contas e publicações</b> com e-mails {@code @acesso.test}: use uma API local ou de teste,
 * nunca a de produção. O passo a passo está em CONTINUIDADE.md.
 *
 * <p>Opcional: {@code ACESSO_API_TESTE_EMPRESA_EMAIL} e {@code ACESSO_API_TESTE_EMPRESA_SENHA} de uma
 * empresa já aprovada liberam o fluxo vaga → candidatura (aprovar empresa é papel da moderação).
 */
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class ContratoApiRealTeste {

    private static final String SENHA = "Acesso@2026";

    private static String base;
    private static OkHttpClient http;
    private static String sufixo;

    /** Contas criadas pelos passos anteriores (os passos seguintes dependem delas). */
    private static SessaoUsuario pessoa;
    private static SessaoUsuario empresa;
    private static String emailPessoa;

    @BeforeClass
    public static void preparar() {
        String url = System.getenv("ACESSO_API_TESTE_URL");
        if (url == null || url.isEmpty()) {
            return; // cada teste aparece como ignorado (exigirApi)
        }
        base = url.endsWith("/") ? url : url + "/";
        http = new OkHttpClient.Builder().callTimeout(30, TimeUnit.SECONDS).build();
        sufixo = Long.toString(System.currentTimeMillis(), 36);
    }

    @Before
    public void exigirApi() {
        assumeTrue("ACESSO_API_TESTE_URL não definida: o contrato com a API real não roda", base != null);
    }

    // ---------------------------------------------------------------------
    // Autenticação

    @Test
    public void t01_cadastroDePessoaComOCorpoDoAppCriaContaComSessao() throws IOException {
        emailPessoa = "pessoa." + sufixo + "@acesso.test";
        DadosCadastroPessoa dados = new DadosCadastroPessoa();
        dados.nome = "Pessoa Contrato " + sufixo;
        dados.email = emailPessoa;
        dados.senha = SENHA;
        dados.telefone = "11987654321";
        dados.cpf = cpfValido(System.currentTimeMillis());
        dados.cidade = "São Paulo";
        dados.estado = "SP";
        dados.dataNascimentoIso = "1970-09-25";

        Resposta resposta = enviar("auth/register/candidato", RepositorioAutenticacaoApi.corpoCadastroPessoa(dados), null);

        assertEquals(resposta.corpo, 201, resposta.codigo);
        ResultadoCadastro resultado = RepositorioAutenticacaoApi.lerResultadoCadastro(resposta.json());
        // A API de main não exige confirmação de e-mail do candidato: a conta já volta com sessão.
        assertFalse(resultado.precisaConfirmarEmail());
        pessoa = resultado.getSessao();
        assertEquals(TipoConta.PESSOA, pessoa.getTipoConta());
        assertEquals(emailPessoa, pessoa.getEmail());
        assertTrue(pessoa.getExpiraEmMillis() > System.currentTimeMillis());
    }

    /** O corpo que o app mandava antes (só nome, e-mail e senha) é recusado com erro em cada campo que falta. */
    @Test
    public void t02_corpoAntigoDoCadastroDePessoaERecusadoComErroPorCampo() throws IOException {
        JsonObject antigo = new JsonObject();
        antigo.addProperty("nome", "Pessoa Antiga " + sufixo);
        antigo.addProperty("email", "antiga." + sufixo + "@acesso.test");
        antigo.addProperty("senha", SENHA);

        Resposta resposta = enviar("auth/register/candidato", antigo, null);

        assertEquals(422, resposta.codigo);
        FalhaHttp falha = TradutorErrosApi.traduzir(resposta.codigo, resposta.corpo);
        for (String campo : Arrays.asList("telefone", "cpf", "pais", "dataNascimento", "cidade", "estado")) {
            assertTrue("faltou erro no campo " + campo + ": " + falha.getErrosCampos(),
                    falha.getErrosCampos().containsKey(campo));
        }
    }

    @Test
    public void t03_loginRenovacaoEAuthMeComOsLeitoresDoApp() throws IOException {
        assumeNotNull(pessoa);
        Resposta login = enviar("auth/login", RepositorioAutenticacaoApi.corpoLogin(emailPessoa, SENHA, false), null);
        assertEquals(login.corpo, 200, login.codigo);
        ResultadoLogin resultado = RepositorioAutenticacaoApi.lerResultadoLogin(login.json());
        assertEquals(ResultadoLogin.Situacao.AUTENTICADO, resultado.getSituacao());
        pessoa = resultado.getSessao();

        JsonObject corpoRenovacao = new JsonObject();
        corpoRenovacao.addProperty("refreshToken", pessoa.getTokenRenovacao());
        Resposta renovacao = enviar("auth/refresh", corpoRenovacao, null);
        assertEquals(renovacao.corpo, 200, renovacao.codigo);
        SessaoUsuario renovada = RepositorioAutenticacaoApi.lerSessao(renovacao.json(), null);
        // O refresh token é rotativo: o novo precisa ser diferente do usado.
        assertFalse(pessoa.getTokenRenovacao().equals(renovada.getTokenRenovacao()));
        pessoa = renovada;

        Resposta eu = obter("auth/me", pessoa.getTokenAcesso());
        assertEquals(eu.corpo, 200, eu.codigo);
        assertNull("pessoa não tem empresa", RepositorioAutenticacaoApi.lerStatusEmpresa(eu.json()));
    }

    @Test
    public void t04_senhaErradaVoltaComAMensagemDaApi() throws IOException {
        assumeNotNull(pessoa);
        Resposta resposta = enviar("auth/login", RepositorioAutenticacaoApi.corpoLogin(emailPessoa, "Errada@2026", false), null);
        assertEquals(401, resposta.codigo);
        FalhaHttp falha = TradutorErrosApi.traduzir(resposta.codigo, resposta.corpo);
        assertNotNull(falha.getMensagem());
        assertFalse(falha.getMensagem().isEmpty());
    }

    @Test
    public void t05_empresaSemContaDePessoaERecusada() throws IOException {
        Resposta resposta = enviar("auth/register/empresa",
                RepositorioAutenticacaoApi.corpoCadastroEmpresa(dadosEmpresa("sem.conta")), null);
        assertEquals(resposta.corpo, 401, resposta.codigo);
    }

    @Test
    public void t06_empresaCriadaPelaContaDePessoaNasceEmAnalise() throws IOException {
        assumeNotNull(pessoa);
        Resposta resposta = enviar("auth/register/empresa",
                RepositorioAutenticacaoApi.corpoCadastroEmpresa(dadosEmpresa("empresa")), pessoa.getTokenAcesso());

        assertEquals(resposta.corpo, 201, resposta.codigo);
        ResultadoCadastro resultado = RepositorioAutenticacaoApi.lerResultadoCadastro(resposta.json());
        if (resultado.precisaConfirmarEmail()) {
            // API com envio de e-mail ligado: sem sessão até confirmar; o app abre TelaConfirmarEmail.
            assertNotNull(resultado.getEmail());
            return;
        }
        empresa = resultado.getSessao();
        assertEquals(TipoConta.EMPRESA, empresa.getTipoConta());
        assertEquals("pendente", empresa.getStatusEmpresa());
    }

    @Test
    public void t07_confirmacaoDeEmailComCodigoErradoEReenvio() throws IOException {
        assumeNotNull(pessoa);
        Resposta errado = enviar("auth/cadastro/confirmar-email",
                RepositorioAutenticacaoApi.corpoConfirmacaoEmail(emailPessoa, "000000"), null);
        assertEquals(errado.corpo, 400, errado.codigo);
        assertEquals("Código inválido ou expirado.", TradutorErrosApi.traduzir(errado.codigo, errado.corpo).getMensagem());

        Resposta curto = enviar("auth/cadastro/confirmar-email",
                RepositorioAutenticacaoApi.corpoConfirmacaoEmail(emailPessoa, "123"), null);
        assertEquals(422, curto.codigo);
        assertTrue(TradutorErrosApi.traduzir(curto.codigo, curto.corpo).getErrosCampos().containsKey("codigo"));

        JsonObject reenvio = new JsonObject();
        reenvio.addProperty("email", emailPessoa);
        assertEquals(200, enviar("auth/cadastro/reenviar-confirmacao", reenvio, null).codigo);
    }

    // ---------------------------------------------------------------------
    // Conteúdo e rede, pelos repositórios do app

    @Test
    public void t08_publicarComentarCurtirEditarEExcluir() {
        assumeNotNull(pessoa);
        RepositorioConteudoApi conteudo = conteudo(pessoa);
        RepositorioSocialApi social = social(pessoa);
        String texto = "Publicação de contrato " + sufixo;

        esperarSucesso((RetornoRepositorio<Void> r) -> conteudo.publicar(pessoa, texto, r));
        List<Publicacao> feed = esperarSucesso(r -> conteudo.listarPublicacoes(pessoa, r));
        Publicacao minha = null;
        for (Publicacao publicacao : feed) {
            if (texto.equals(publicacao.conteudo)) {
                minha = publicacao;
            }
        }
        assertNotNull("a publicação não apareceu no feed", minha);
        assertEquals(pessoa.getIdUsuario(), minha.autorId);
        String id = minha.id;

        esperarSucesso((RetornoRepositorio<Void> r) -> social.comentar(pessoa, id, "Comentário de contrato", null, r));
        List<Comentario> comentarios = esperarSucesso(r -> social.listarComentarios(pessoa, id, r));
        assertEquals(1, comentarios.size());

        Publicacao.Curtida curtida = esperarSucesso(r -> conteudo.curtir(pessoa, id, r));
        assertTrue(curtida.curtido);
        assertEquals(1, curtida.total);

        esperarSucesso((RetornoRepositorio<Void> r) -> social.editarPublicacao(pessoa, id, texto + " (editada)", r));
        esperarSucesso((RetornoRepositorio<Void> r) -> social.excluirPublicacao(pessoa, id, r));
    }

    @Test
    public void t09_perfilEdicaoEFoto() throws IOException {
        assumeNotNull(pessoa);
        RepositorioConteudoApi conteudo = conteudo(pessoa);
        RepositorioSocialApi social = social(pessoa);

        PerfilConta perfil = esperarSucesso(r -> conteudo.carregarPerfil(pessoa, r));
        assertEquals(pessoa.getIdUsuario(), perfil.usuarioId);
        assertNotNull("o perfil precisa do id do candidato para editar", perfil.registroId);

        EdicaoPerfil edicao = new EdicaoPerfil();
        edicao.usuarioId = perfil.usuarioId;
        edicao.registroId = perfil.registroId;
        edicao.tipoConta = TipoConta.PESSOA;
        edicao.nome = perfil.nomeEditavel != null ? perfil.nomeEditavel : "Pessoa Contrato " + sufixo;
        edicao.tituloProfissional = "Analista de contrato";
        edicao.sobre = "Perfil criado pelo teste de contrato do app.";
        edicao.cidade = "Campinas";
        edicao.estado = "SP";
        esperarSucesso((RetornoRepositorio<Void> r) -> social.atualizarPerfil(pessoa, edicao, r));

        PerfilConta atualizado = esperarSucesso(r -> conteudo.carregarPerfil(pessoa, r));
        assertEquals("Analista de contrato", atualizado.tituloProfissional);

        byte[] foto = fotoDeTeste();
        String url = esperarSucesso(r -> social.enviarImagem(pessoa, RepositorioSocial.Imagem.FOTO_PERFIL,
                pessoa.getIdUsuario(), foto, r));
        assertNotNull(url);
        assertFalse(url.isEmpty());
    }

    @Test
    public void t10_buscaNotificacoesEMensagens() {
        assumeNotNull(pessoa);
        List<ItemBusca> resultados = esperarSucesso(r ->
                conteudo(pessoa).buscar(pessoa, "Contrato", ItemBusca.Categoria.PESSOAS, r));
        assertNotNull(resultados);
        assertNotNull(esperarSucesso((RetornoRepositorio<List<Notificacao>> r) -> notificacoes(pessoa).listar(pessoa, r)));
        assertNotNull(esperarSucesso((RetornoRepositorio<Integer> r) -> notificacoes(pessoa).contarNaoLidas(pessoa, r)));
        assertNotNull(esperarSucesso((RetornoRepositorio<List<Conversa>> r) -> mensagens(pessoa).listarConversas(pessoa, r)));
        assertNotNull(esperarSucesso((RetornoRepositorio<Integer> r) -> mensagens(pessoa).contarNaoLidas(pessoa, r)));
        assertNotNull(esperarSucesso((RetornoRepositorio<List<Candidatura>> r) -> conteudo(pessoa).listarCandidaturas(pessoa, r)));
    }

    /** Empresa em análise vê o motivo; a regra é do servidor (garantirEmpresaAprovadaMiddleware). */
    @Test
    public void t11_empresaEmAnaliseNaoPublicaVaga() {
        assumeNotNull(empresa);
        Retorno<Void> retorno = esperar(r -> conteudo(empresa).criarVaga(empresa, vagaDeTeste("pendente"), r));
        assertNotNull("a API devia recusar vaga de empresa em análise", retorno.erro);
    }

    @Test
    public void t12_pessoaSegueAEmpresa() {
        assumeNotNull(pessoa);
        assumeNotNull(empresa);
        PerfilConta perfilEmpresa = esperarSucesso(r ->
                conteudo(pessoa).carregarPerfilDeUsuario(pessoa, empresa.getIdUsuario(), r));
        assertEquals(TipoConta.EMPRESA, perfilEmpresa.tipoConta);

        ResumoSeguidores antes = esperarSucesso(r -> social(pessoa).carregarResumoSeguidores(pessoa, perfilEmpresa, r));
        assertFalse(antes.seguindo);
        ResumoSeguidores depois = esperarSucesso(r -> social(pessoa).alternarSeguir(pessoa, perfilEmpresa, antes, r));
        assertTrue(depois.seguindo);
    }

    /** Só com uma empresa aprovada (variáveis opcionais): publica a vaga e a pessoa se candidata. */
    @Test
    public void t13_vagaECandidaturaComEmpresaAprovada() throws IOException {
        assumeNotNull(pessoa);
        String emailEmpresa = System.getenv("ACESSO_API_TESTE_EMPRESA_EMAIL");
        String senhaEmpresa = System.getenv("ACESSO_API_TESTE_EMPRESA_SENHA");
        assumeTrue("sem empresa aprovada para o teste", emailEmpresa != null && senhaEmpresa != null);

        Resposta login = enviar("auth/login", RepositorioAutenticacaoApi.corpoLogin(emailEmpresa, senhaEmpresa, false), null);
        assertEquals(login.corpo, 200, login.codigo);
        SessaoUsuario aprovada = RepositorioAutenticacaoApi.lerResultadoLogin(login.json()).getSessao();
        assertEquals("aprovada", aprovada.getStatusEmpresa());

        // Logo enviado pelo app aparece nos cartões de vaga (empresa.logo em GET /vagas).
        PerfilConta perfilEmpresa = esperarSucesso(r -> conteudo(aprovada).carregarPerfil(aprovada, r));
        byte[] logo = fotoDeTeste();
        String urlLogo = esperarSucesso(r -> social(aprovada).enviarImagem(aprovada,
                RepositorioSocial.Imagem.LOGO_EMPRESA, perfilEmpresa.registroId, logo, r));

        String titulo = "Vaga de contrato " + sufixo;
        esperarSucesso((RetornoRepositorio<Void> r) -> conteudo(aprovada).criarVaga(aprovada, vagaDeTeste(titulo), r));

        List<Vaga> vagas = esperarSucesso(r -> conteudo(pessoa).listarVagas(pessoa, titulo, null, null, r));
        assertEquals(1, vagas.size());
        assertEquals(urlLogo, vagas.get(0).logoEmpresaUrl);
        String vagaId = vagas.get(0).id;
        Vaga vaga = esperarSucesso(r -> conteudo(pessoa).obterVaga(pessoa, vagaId, r));
        assertEquals(titulo, vaga.titulo);

        esperarSucesso((RetornoRepositorio<Void> r) -> conteudo(pessoa).candidatar(pessoa, vagaId, "Tenho interesse.", r));
        List<Candidatura> candidaturas = esperarSucesso(r -> conteudo(pessoa).listarCandidaturas(pessoa, r));
        boolean achou = false;
        for (Candidatura candidatura : candidaturas) {
            achou |= vagaId.equals(candidatura.vagaId);
        }
        assertTrue("a candidatura não apareceu em Minhas candidaturas", achou);

        ResumoEmpresa painel = esperarSucesso(r -> conteudo(aprovada).carregarResumoEmpresa(aprovada, r));
        assertTrue(painel.candidaturas >= 1);
    }

    /** Depois de sair, o refresh token antigo não vale mais e o app trata como sessão expirada. */
    @Test
    public void t99_sairRevogaARenovacao() throws IOException {
        assumeNotNull(pessoa);
        JsonObject corpo = new JsonObject();
        corpo.addProperty("refreshToken", pessoa.getTokenRenovacao());
        assertEquals(200, enviar("auth/logout", corpo, pessoa.getTokenAcesso()).codigo);

        Resposta renovacao = enviar("auth/refresh", corpo, null);
        assertEquals(401, renovacao.codigo);
        FalhaHttp falha = RepositorioAutenticacaoApi.traduzirFalhaDeRenovacao(renovacao.codigo, renovacao.corpo);
        assertEquals(CodigosErro.SESSAO_EXPIRADA, falha.getCodigoErro());
    }

    // ---------------------------------------------------------------------

    private static DadosCadastroEmpresa dadosEmpresa(String prefixo) {
        DadosCadastroEmpresa dados = new DadosCadastroEmpresa();
        dados.nome = "Responsável Contrato";
        dados.email = prefixo + "." + sufixo + "@acesso.test";
        dados.senha = SENHA;
        dados.cnpj = cnpjValido(System.nanoTime());
        dados.razaoSocial = "Empresa Contrato " + sufixo + " Ltda";
        dados.porte = "pequena";
        dados.cidade = "Campinas";
        dados.estado = "SP";
        return dados;
    }

    private static Vaga vagaDeTeste(String titulo) {
        Vaga vaga = new Vaga();
        vaga.titulo = titulo;
        vaga.descricao = "Vaga criada pelo teste de contrato do app, com descrição longa o bastante.";
        vaga.modalidade = "remoto";
        vaga.contrato = "clt";
        vaga.status = "aberta";
        return vaga;
    }

    private static RepositorioConteudoApi conteudo(SessaoUsuario sessao) {
        return new RepositorioConteudoApi(executor(sessao), base, () -> true, System::currentTimeMillis);
    }

    private static RepositorioSocialApi social(SessaoUsuario sessao) {
        return new RepositorioSocialApi(executor(sessao), base, () -> true, System::currentTimeMillis);
    }

    private static RepositorioMensagensApi mensagens(SessaoUsuario sessao) {
        return new RepositorioMensagensApi(executor(sessao), base, () -> true, System::currentTimeMillis);
    }

    private static RepositorioNotificacoesApi notificacoes(SessaoUsuario sessao) {
        return new RepositorioNotificacoesApi(executor(sessao), base, () -> true, System::currentTimeMillis);
    }

    /** Mesmo ExecutorHttp do app, entregando na própria thread; os tokens do teste não vencem durante a execução. */
    private static ExecutorHttp executor(SessaoUsuario sessao) {
        ExecutorHttp.ProvedorSessao provedor = new ExecutorHttp.ProvedorSessao() {
            @Override
            public SessaoUsuario atual() {
                return sessao;
            }

            @Override
            public void renovar(SessaoUsuario usada, RetornoRepositorio<SessaoUsuario> retorno) {
                retorno.aoFalhar("renovação não esperada durante o teste");
            }

            @Override
            public void encerrar(String codigo, String mensagem) {
            }
        };
        return new ExecutorHttp(http, Runnable::run, () -> true, TradutorErrosApi::traduzir, provedor);
    }

    private static final class Retorno<T> {
        T valor;
        String erro;
        Map<String, String> campos;
    }

    private static <T> Retorno<T> esperar(Consumer<RetornoRepositorio<T>> chamada) {
        CountDownLatch fim = new CountDownLatch(1);
        Retorno<T> retorno = new Retorno<>();
        chamada.accept(new RetornoRepositorio<T>() {
            @Override
            public void aoConcluir(T resultado) {
                retorno.valor = resultado;
                fim.countDown();
            }

            @Override
            public void aoFalhar(String mensagem) {
                retorno.erro = mensagem;
                fim.countDown();
            }

            @Override
            public void aoFalharComCampos(String mensagem, Map<String, String> errosCampos) {
                retorno.erro = mensagem;
                retorno.campos = errosCampos;
                fim.countDown();
            }

            @Override
            public void aoFalharComCodigo(String mensagem, String codigo) {
                retorno.erro = mensagem + " (" + codigo + ")";
                fim.countDown();
            }
        });
        try {
            assertTrue("a API não respondeu em 30 s", fim.await(30, TimeUnit.SECONDS));
        } catch (InterruptedException interrompido) {
            Thread.currentThread().interrupt();
            throw new AssertionError(interrompido);
        }
        return retorno;
    }

    private static <T> T esperarSucesso(Consumer<RetornoRepositorio<T>> chamada) {
        Retorno<T> retorno = esperar(chamada);
        assertNull("a API recusou: " + retorno.erro + (retorno.campos != null ? " " + retorno.campos : ""), retorno.erro);
        return retorno.valor;
    }

    private static final class Resposta {
        final int codigo;
        final String corpo;

        Resposta(int codigo, String corpo) {
            this.codigo = codigo;
            this.corpo = corpo;
        }

        JsonObject json() {
            return JsonParser.parseString(corpo).getAsJsonObject();
        }
    }

    private static Resposta enviar(String caminho, JsonObject corpo, String token) throws IOException {
        Request.Builder pedido = new Request.Builder().url(base + caminho)
                .post(RequestBody.create(corpo.toString(), ClienteHttp.TIPO_JSON));
        if (token != null) {
            pedido.header("Authorization", "Bearer " + token);
        }
        return executar(pedido.build());
    }

    private static Resposta obter(String caminho, String token) throws IOException {
        return executar(new Request.Builder().url(base + caminho).header("Authorization", "Bearer " + token).get().build());
    }

    private static Resposta executar(Request pedido) throws IOException {
        try (Response resposta = http.newCall(pedido).execute()) {
            return new Resposta(resposta.code(), resposta.body() != null ? resposta.body().string() : "");
        }
    }

    private static byte[] fotoDeTeste() throws IOException {
        try (InputStream entrada = ContratoApiRealTeste.class.getResourceAsStream("/foto_teste.jpg")) {
            assertNotNull("foto_teste.jpg não está em src/test/resources", entrada);
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] bloco = new byte[4096];
            int lidos;
            while ((lidos = entrada.read(bloco)) != -1) {
                bytes.write(bloco, 0, lidos);
            }
            return bytes.toByteArray();
        }
    }

    /** CPF válido pelo dígito verificador, diferente a cada execução (a API recusa CPF repetido). */
    static String cpfValido(long semente) {
        int[] d = new int[11];
        long resto = Math.abs(semente);
        for (int i = 0; i < 9; i++) {
            d[i] = (int) (resto % 10);
            resto /= 10;
        }
        d[0] = (d[0] % 9) + 1; // evita CPF com todos os dígitos iguais
        d[9] = digitoCpf(d, 9);
        d[10] = digitoCpf(d, 10);
        StringBuilder cpf = new StringBuilder();
        for (int digito : d) {
            cpf.append(digito);
        }
        return cpf.toString();
    }

    private static int digitoCpf(int[] d, int tamanho) {
        int soma = 0;
        for (int i = 0; i < tamanho; i++) {
            soma += d[i] * (tamanho + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    /** CNPJ válido pelo dígito verificador, diferente a cada execução (a API recusa CNPJ repetido). */
    static String cnpjValido(long semente) {
        int[] d = new int[14];
        long resto = Math.abs(semente);
        for (int i = 0; i < 8; i++) {
            d[i] = (int) (resto % 10);
            resto /= 10;
        }
        d[0] = (d[0] % 9) + 1;
        d[8] = 0;
        d[9] = 0;
        d[10] = 0;
        d[11] = 1;
        d[12] = digitoCnpj(d, new int[]{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2});
        d[13] = digitoCnpj(d, new int[]{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2});
        StringBuilder cnpj = new StringBuilder();
        for (int digito : d) {
            cnpj.append(digito);
        }
        return cnpj.toString();
    }

    private static int digitoCnpj(int[] d, int[] pesos) {
        int soma = 0;
        for (int i = 0; i < pesos.length; i++) {
            soma += d[i] * pesos[i];
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
