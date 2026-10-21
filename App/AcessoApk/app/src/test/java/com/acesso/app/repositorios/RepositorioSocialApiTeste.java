package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.Comentario;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.time.Instant;
import java.util.List;

/**
 * Comentários, edição de publicações, seguir, edição do perfil e envio de imagens contra o servidor falso,
 * com respostas no formato do backend (ComentarioService, SeguidorService, UsuarioController, EmpresaController).
 */
public class RepositorioSocialApiTeste {

    private static final String UUID_POSTAGEM = "11111111-1111-4111-8111-111111111111";
    private static final String UUID_USUARIO = "22222222-2222-4222-8222-222222222222";
    private static final String UUID_REGISTRO = "33333333-3333-4333-8333-333333333333";
    private static final SessaoUsuario SESSAO = new SessaoUsuario(UUID_USUARIO, "a@acesso.test", "Ana", TipoConta.PESSOA,
            null, "token-de-teste", "renovacao-de-teste", System.currentTimeMillis() + 3_600_000, "api");

    private ServidorFalso servidor;

    @Before
    public void iniciar() throws Exception {
        servidor = new ServidorFalso();
    }

    @After
    public void parar() throws Exception {
        servidor.parar();
    }

    private RepositorioSocialApi repositorio() {
        return new RepositorioSocialApi(ServidorFalso.executor(SESSAO), servidor.urlBase(), () -> true,
                () -> Instant.parse("2026-10-14T12:00:00.000Z").toEpochMilli());
    }

    private static PerfilConta alvo(TipoConta tipo) {
        PerfilConta perfil = new PerfilConta();
        perfil.tipoConta = tipo;
        perfil.usuarioId = UUID_USUARIO;
        perfil.registroId = UUID_REGISTRO;
        return perfil;
    }

    // --- Comentários ---

    @Test
    public void listaComentariosComRespostasAutorEFoto() throws Exception {
        servidor.responder("GET /api/postagens/" + UUID_POSTAGEM + "/comentarios", 200,
                "{\"sucesso\":true,\"total\":2,\"comentarios\":[{\"id\":\"c1\",\"usuarioId\":\"u9\","
                        + "\"comentario\":\"Parabéns!\",\"criadoEm\":\"2026-10-14T10:00:00.000Z\",\"editadoEm\":null,"
                        + "\"usuario\":{\"id\":\"u9\",\"nome\":\"Bia\",\"fotoPerfil\":\"https://cdn.test/bia.jpg\","
                        + "\"tipoUsuario\":\"candidato\"},\"respostas\":[{\"id\":\"c2\",\"comentario\":\"Obrigada\","
                        + "\"criadoEm\":\"2026-10-14T11:30:00.000Z\",\"editadoEm\":\"2026-10-14T11:40:00.000Z\","
                        + "\"usuario\":{\"id\":\"u1\",\"nome\":\"Ana\",\"fotoPerfil\":null,\"tipoUsuario\":\"empresa\"}}]}]}");
        ServidorFalso.Anotador<List<Comentario>> anotador = new ServidorFalso.Anotador<>();

        repositorio().listarComentarios(SESSAO, UUID_POSTAGEM, anotador);

        List<Comentario> lista = anotador.aguardar();
        assertNotNull(anotador.mensagem, lista);
        assertEquals(1, lista.size());
        Comentario primeiro = lista.get(0);
        assertEquals("Parabéns!", primeiro.texto);
        assertEquals("Bia", primeiro.nomeAutor);
        assertEquals("https://cdn.test/bia.jpg", primeiro.fotoAutorUrl);
        assertEquals("há 2 horas", primeiro.quando);
        assertFalse(primeiro.editado);
        assertEquals(1, primeiro.respostas.size());
        assertEquals("Obrigada", primeiro.respostas.get(0).texto);
        assertTrue(primeiro.respostas.get(0).editado);
        assertEquals(TipoConta.EMPRESA, primeiro.respostas.get(0).tipoAutor);
        assertEquals("Bearer token-de-teste", servidor.pedidos.get(0).autorizacao);
        assertTrue(servidor.pedidos.get(0).alvo.contains("page=1"));
    }

    @Test
    public void comentarEnviaOTextoEOPaiDaResposta() throws Exception {
        servidor.responder("POST /api/postagens/" + UUID_POSTAGEM + "/comentarios", 201,
                "{\"sucesso\":true,\"comentario\":{\"id\":\"c3\"}}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().comentar(SESSAO, UUID_POSTAGEM, "Boa!", UUID_REGISTRO, anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        ServidorFalso.Pedido pedido = servidor.pedidos.get(0);
        assertEquals("POST", pedido.metodo);
        assertTrue(pedido.corpo.contains("\"comentario\":\"Boa!\""));
        assertTrue(pedido.corpo.contains("\"comentarioPaiId\":\"" + UUID_REGISTRO + "\""));
    }

    @Test
    public void comentarioNovoNaoEnviaPaiVazio() throws Exception {
        servidor.responder("POST /api/postagens/" + UUID_POSTAGEM + "/comentarios", 201, "{\"sucesso\":true}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().comentar(SESSAO, UUID_POSTAGEM, "Oi", null, anotador);

        anotador.aguardar();
        assertFalse(servidor.pedidos.get(0).corpo.contains("comentarioPaiId"));
    }

    @Test
    public void errosDeValidacaoDoComentarioChegamEmPortugues() throws Exception {
        servidor.responder("POST /api/postagens/" + UUID_POSTAGEM + "/comentarios", 400,
                "{\"sucesso\":false,\"mensagem\":\"O comentário deve ter entre 1 e 1000 caracteres.\"}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().comentar(SESSAO, UUID_POSTAGEM, "x", null, anotador);

        anotador.aguardar();
        assertEquals("O comentário deve ter entre 1 e 1000 caracteres.", anotador.mensagem);
    }

    @Test
    public void excluirComentarioUsaDelete() throws Exception {
        servidor.responder("DELETE /api/comentarios/" + UUID_REGISTRO, 200, "{\"sucesso\":true}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().excluirComentario(SESSAO, UUID_REGISTRO, anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals("DELETE", servidor.pedidos.get(0).metodo);
    }

    // --- Publicações ---

    @Test
    public void editarPublicacaoUsaPutComOConteudo() throws Exception {
        servidor.responder("PUT /api/postagens/" + UUID_POSTAGEM, 200, "{\"sucesso\":true,\"postagem\":{}}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().editarPublicacao(SESSAO, UUID_POSTAGEM, "Texto novo", anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals("PUT", servidor.pedidos.get(0).metodo);
        assertTrue(servidor.pedidos.get(0).corpo.contains("\"conteudo\":\"Texto novo\""));
    }

    @Test
    public void editarPublicacaoDeOutraPessoaMostraARecusaDaApi() throws Exception {
        servidor.responder("PUT /api/postagens/" + UUID_POSTAGEM, 403,
                "{\"sucesso\":false,\"mensagem\":\"Você não possui permissão sobre este recurso.\"}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().editarPublicacao(SESSAO, UUID_POSTAGEM, "x", anotador);

        anotador.aguardar();
        assertEquals("Você não possui permissão sobre este recurso.", anotador.mensagem);
    }

    @Test
    public void excluirPublicacaoUsaDelete() throws Exception {
        servidor.responder("DELETE /api/postagens/" + UUID_POSTAGEM, 200, "{\"sucesso\":true}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().excluirPublicacao(SESSAO, UUID_POSTAGEM, anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals("DELETE", servidor.pedidos.get(0).metodo);
    }

    // --- Seguir ---

    @Test
    public void resumoDeUmaPessoaLeContadoresEPrivacidade() throws Exception {
        servidor.responder("GET /api/seguir/resumo/" + UUID_USUARIO, 200,
                "{\"sucesso\":true,\"totalSeguidores\":12,\"totalSeguindo\":7,\"seguindoEsteUsuario\":false,"
                        + "\"perfilPublico\":false,\"elesSeguemVoce\":false,\"solicitacaoPendente\":true,\"bloqueado\":false}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();

        repositorio().carregarResumoSeguidores(SESSAO, alvo(TipoConta.PESSOA), anotador);

        ResumoSeguidores resumo = anotador.aguardar();
        assertEquals(12, resumo.totalSeguidores);
        assertEquals(7, resumo.totalSeguindo);
        assertFalse(resumo.seguindo);
        assertTrue(resumo.perfilPrivado);
        assertTrue(resumo.solicitacaoPendente);
    }

    @Test
    public void resumoDeUmaEmpresaUsaOIdDaEmpresa() throws Exception {
        servidor.responder("GET /api/seguir/resumo/empresas/" + UUID_REGISTRO, 200,
                "{\"sucesso\":true,\"totalSeguidores\":5,\"seguindoEstaEmpresa\":true}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();

        repositorio().carregarResumoSeguidores(SESSAO, alvo(TipoConta.EMPRESA), anotador);

        ResumoSeguidores resumo = anotador.aguardar();
        assertEquals(5, resumo.totalSeguidores);
        assertTrue(resumo.seguindo);
    }

    @Test
    public void seguirUmaPessoaPublicaPassaPelaRotaDeSolicitacao() throws Exception {
        servidor.responder("POST /api/seguir/solicitacoes/" + UUID_USUARIO, 200,
                "{\"sucesso\":true,\"seguindo\":true,\"totalSeguidores\":13,\"solicitacaoCriada\":false}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();
        ResumoSeguidores atual = new ResumoSeguidores();
        atual.totalSeguidores = 12;

        repositorio().alternarSeguir(SESSAO, alvo(TipoConta.PESSOA), atual, anotador);

        ResumoSeguidores depois = anotador.aguardar();
        assertTrue(depois.seguindo);
        assertEquals(13, depois.totalSeguidores);
        assertFalse(depois.solicitacaoPendente);
    }

    @Test
    public void seguirUmPerfilPrivadoCriaOPedido() throws Exception {
        servidor.responder("POST /api/seguir/solicitacoes/" + UUID_USUARIO, 200,
                "{\"sucesso\":true,\"seguindo\":false,\"solicitacaoCriada\":true,\"solicitacaoPendente\":true}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();
        ResumoSeguidores atual = new ResumoSeguidores();
        atual.perfilPrivado = true;
        atual.totalSeguidores = 4;

        repositorio().alternarSeguir(SESSAO, alvo(TipoConta.PESSOA), atual, anotador);

        ResumoSeguidores depois = anotador.aguardar();
        assertFalse(depois.seguindo);
        assertTrue(depois.solicitacaoPendente);
        assertTrue(depois.perfilPrivado);
        assertEquals(4, depois.totalSeguidores);
    }

    @Test
    public void deixarDeSeguirAlternaPelaRotaDeUsuarios() throws Exception {
        servidor.responder("POST /api/seguir/usuarios/" + UUID_USUARIO, 200,
                "{\"sucesso\":true,\"seguindo\":false,\"totalSeguidores\":11}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();
        ResumoSeguidores atual = new ResumoSeguidores();
        atual.seguindo = true;
        atual.totalSeguindo = 3;

        repositorio().alternarSeguir(SESSAO, alvo(TipoConta.PESSOA), atual, anotador);

        ResumoSeguidores depois = anotador.aguardar();
        assertFalse(depois.seguindo);
        assertEquals(11, depois.totalSeguidores);
        assertEquals(3, depois.totalSeguindo);
    }

    @Test
    public void cancelarPedidoUsaDeleteDeSolicitacoes() throws Exception {
        servidor.responder("DELETE /api/seguir/solicitacoes/" + UUID_USUARIO, 200,
                "{\"sucesso\":true,\"solicitacaoPendente\":false}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();
        ResumoSeguidores atual = new ResumoSeguidores();
        atual.solicitacaoPendente = true;
        atual.perfilPrivado = true;
        atual.totalSeguidores = 4;

        repositorio().alternarSeguir(SESSAO, alvo(TipoConta.PESSOA), atual, anotador);

        ResumoSeguidores depois = anotador.aguardar();
        assertFalse(depois.solicitacaoPendente);
        assertFalse(depois.seguindo);
        assertEquals(4, depois.totalSeguidores);
        assertEquals("DELETE", servidor.pedidos.get(0).metodo);
    }

    @Test
    public void seguirUmaEmpresaUsaOIdDaEmpresa() throws Exception {
        servidor.responder("POST /api/seguir/empresas/" + UUID_REGISTRO, 200,
                "{\"sucesso\":true,\"seguindo\":true,\"totalSeguidores\":6}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();

        repositorio().alternarSeguir(SESSAO, alvo(TipoConta.EMPRESA), new ResumoSeguidores(), anotador);

        ResumoSeguidores depois = anotador.aguardar();
        assertTrue(depois.seguindo);
        assertEquals(6, depois.totalSeguidores);
    }

    @Test
    public void apenasCandidatosSeguemEmpresasEAMensagemDaApiChega() throws Exception {
        servidor.responder("POST /api/seguir/empresas/" + UUID_REGISTRO, 403,
                "{\"sucesso\":false,\"mensagem\":\"Apenas candidatos podem seguir empresas.\"}");
        ServidorFalso.Anotador<ResumoSeguidores> anotador = new ServidorFalso.Anotador<>();

        repositorio().alternarSeguir(SESSAO, alvo(TipoConta.EMPRESA), new ResumoSeguidores(), anotador);

        anotador.aguardar();
        assertEquals("Apenas candidatos podem seguir empresas.", anotador.mensagem);
    }

    // --- Editar o perfil ---

    private static EdicaoPerfil edicao(TipoConta tipo) {
        EdicaoPerfil edicao = new EdicaoPerfil();
        edicao.usuarioId = UUID_USUARIO;
        edicao.registroId = UUID_REGISTRO;
        edicao.tipoConta = tipo;
        edicao.nome = "Ana Souza";
        edicao.tituloProfissional = "Analista";
        edicao.sobre = "Bio";
        edicao.cidade = "Recife";
        edicao.estado = "pe";
        edicao.setor = "Tecnologia";
        edicao.culturaInclusiva = "Libras";
        edicao.site = "";
        return edicao;
    }

    @Test
    public void editarPerfilDePessoaAtualizaAContaEDepoisOCandidato() throws Exception {
        servidor.responder("PUT /api/usuarios/" + UUID_USUARIO, 200, "{\"sucesso\":true,\"usuario\":{}}");
        servidor.responder("PUT /api/candidatos/" + UUID_REGISTRO, 200, "{\"sucesso\":true,\"candidato\":{}}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().atualizarPerfil(SESSAO, edicao(TipoConta.PESSOA), anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals(2, servidor.pedidos.size());
        ServidorFalso.Pedido conta = servidor.pedidos.get(0);
        assertEquals("/api/usuarios/" + UUID_USUARIO, conta.alvo);
        assertTrue(conta.corpo.contains("\"nome\":\"Ana Souza\""));
        // Campos sensíveis nunca saem do app.
        assertFalse(conta.corpo.contains("email"));
        assertFalse(conta.corpo.contains("tipoUsuario"));
        ServidorFalso.Pedido candidato = servidor.pedidos.get(1);
        assertEquals("/api/candidatos/" + UUID_REGISTRO, candidato.alvo);
        assertTrue(candidato.corpo.contains("\"tituloProfissional\":\"Analista\""));
        assertTrue(candidato.corpo.contains("\"biografia\":\"Bio\""));
        assertTrue(candidato.corpo.contains("\"estado\":\"PE\""));
        assertFalse(candidato.corpo.contains("cpf"));
    }

    @Test
    public void seAContaFalharOCandidatoNaoEAtualizado() throws Exception {
        servidor.responder("PUT /api/usuarios/" + UUID_USUARIO, 400,
                "{\"sucesso\":false,\"mensagem\":\"Informe um nome entre 3 e 150 caracteres.\"}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().atualizarPerfil(SESSAO, edicao(TipoConta.PESSOA), anotador);

        anotador.aguardar();
        assertEquals("Informe um nome entre 3 e 150 caracteres.", anotador.mensagem);
        assertEquals(1, servidor.pedidos.size());
    }

    @Test
    public void editarPerfilDeEmpresaAtualizaSoOCadastroDaEmpresa() throws Exception {
        servidor.responder("PUT /api/empresas/" + UUID_REGISTRO, 200, "{\"sucesso\":true,\"empresa\":{}}");
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().atualizarPerfil(SESSAO, edicao(TipoConta.EMPRESA), anotador);

        anotador.aguardar();
        assertNull(anotador.mensagem);
        assertEquals(1, servidor.pedidos.size());
        String corpo = servidor.pedidos.get(0).corpo;
        assertTrue(corpo.contains("\"nomeFantasia\":\"Ana Souza\""));
        assertTrue(corpo.contains("\"setor\":\"Tecnologia\""));
        assertTrue(corpo.contains("\"descricao\":\"Bio\""));
        assertTrue(corpo.contains("\"culturaInclusiva\":\"Libras\""));
        // Site vazio não vai (a API exige URL válida quando há valor); CNPJ e verificação nunca saem do app.
        assertFalse(corpo.contains("\"site\""));
        assertFalse(corpo.contains("cnpj"));
        assertFalse(corpo.contains("empresaVerificada"));
    }

    // --- Imagens ---

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F'};

    @Test
    public void enviaAFotoDePerfilComoMultipartNoCampoFoto() throws Exception {
        servidor.responder("PATCH /api/usuarios/" + UUID_USUARIO + "/foto", 200,
                "{\"sucesso\":true,\"usuario\":{\"id\":\"" + UUID_USUARIO + "\",\"fotoPerfil\":\"https://cdn.test/perfis/a.jpg\"}}");
        ServidorFalso.Anotador<String> anotador = new ServidorFalso.Anotador<>();

        repositorio().enviarImagem(SESSAO, RepositorioSocial.Imagem.FOTO_PERFIL, UUID_USUARIO, JPEG, anotador);

        assertEquals("https://cdn.test/perfis/a.jpg", anotador.aguardar());
        ServidorFalso.Pedido pedido = servidor.pedidos.get(0);
        assertEquals("PATCH", pedido.metodo);
        assertTrue(pedido.tipoConteudo.startsWith("multipart/form-data"));
        assertTrue(pedido.corpo.contains("name=\"foto\""));
        assertTrue(pedido.corpo.contains("filename=\"foto.jpg\""));
        assertTrue(pedido.corpo.contains("Content-Type: image/jpeg"));
        assertEquals("Bearer token-de-teste", pedido.autorizacao);
    }

    @Test
    public void enviaACapaDePerfilNoCampoCapa() throws Exception {
        servidor.responder("PATCH /api/usuarios/" + UUID_USUARIO + "/capa", 200,
                "{\"sucesso\":true,\"usuario\":{\"capaPerfil\":\"https://cdn.test/perfis/c.jpg\"}}");
        ServidorFalso.Anotador<String> anotador = new ServidorFalso.Anotador<>();

        repositorio().enviarImagem(SESSAO, RepositorioSocial.Imagem.CAPA_PERFIL, UUID_USUARIO, JPEG, anotador);

        assertEquals("https://cdn.test/perfis/c.jpg", anotador.aguardar());
        assertTrue(servidor.pedidos.get(0).corpo.contains("name=\"capa\""));
    }

    @Test
    public void logoEECapaDaEmpresaUsamOIdDaEmpresa() throws Exception {
        servidor.responder("PATCH /api/empresas/" + UUID_REGISTRO + "/logo", 200,
                "{\"sucesso\":true,\"empresa\":{\"logo\":\"/uploads/empresas/l.jpg\"}}");
        servidor.responder("PATCH /api/empresas/" + UUID_REGISTRO + "/capa", 200,
                "{\"sucesso\":true,\"empresa\":{\"capa\":\"https://cdn.test/e/c.jpg\"}}");
        ServidorFalso.Anotador<String> logo = new ServidorFalso.Anotador<>();
        ServidorFalso.Anotador<String> capa = new ServidorFalso.Anotador<>();

        repositorio().enviarImagem(SESSAO, RepositorioSocial.Imagem.LOGO_EMPRESA, UUID_REGISTRO, JPEG, logo);
        repositorio().enviarImagem(SESSAO, RepositorioSocial.Imagem.CAPA_EMPRESA, UUID_REGISTRO, JPEG, capa);

        // O armazenamento em disco devolve um caminho relativo: o app o guarda como veio e resolve ao exibir.
        assertEquals("/uploads/empresas/l.jpg", logo.aguardar());
        assertEquals("https://cdn.test/e/c.jpg", capa.aguardar());
        assertTrue(servidor.pedidos.get(0).corpo.contains("name=\"logo\""));
    }

    @Test
    public void empresaNaoAprovadaVeAMensagemDaApiAoEnviarLogo() throws Exception {
        servidor.responder("PATCH /api/empresas/" + UUID_REGISTRO + "/logo", 403,
                "{\"sucesso\":false,\"mensagem\":\"Sua empresa ainda não foi aprovada.\"}");
        ServidorFalso.Anotador<String> anotador = new ServidorFalso.Anotador<>();

        repositorio().enviarImagem(SESSAO, RepositorioSocial.Imagem.LOGO_EMPRESA, UUID_REGISTRO, JPEG, anotador);

        anotador.aguardar();
        assertEquals("Sua empresa ainda não foi aprovada.", anotador.mensagem);
    }

    @Test
    public void respostaSemAUrlDaImagemViraErroEmVezDeSucessoFalso() throws Exception {
        servidor.responder("PATCH /api/usuarios/" + UUID_USUARIO + "/foto", 200, "{\"sucesso\":true,\"usuario\":{}}");
        ServidorFalso.Anotador<String> anotador = new ServidorFalso.Anotador<>();

        repositorio().enviarImagem(SESSAO, RepositorioSocial.Imagem.FOTO_PERFIL, UUID_USUARIO, JPEG, anotador);

        anotador.aguardar();
        assertNotNull(anotador.mensagem);
    }

    // --- Proteções ---

    @Test
    public void identificadorComBarraNuncaMontaOutraRota() throws Exception {
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        repositorio().excluirPublicacao(SESSAO, "../usuarios/x", anotador);

        anotador.aguardar();
        assertEquals(RepositorioConteudoApi.AVISO_ID_INVALIDO, anotador.mensagem);
        assertTrue(servidor.pedidos.isEmpty());
    }

    @Test
    public void semUrlDaApiNaoEnviaNada() throws Exception {
        RepositorioSocialApi semUrl = new RepositorioSocialApi(ServidorFalso.executor(SESSAO), servidor.urlBase(),
                () -> false, () -> 0L);
        ServidorFalso.Anotador<Void> anotador = new ServidorFalso.Anotador<>();

        semUrl.excluirPublicacao(SESSAO, UUID_POSTAGEM, anotador);

        anotador.aguardar();
        assertEquals(RepositorioConteudoApi.AVISO_SEM_URL, anotador.mensagem);
        assertTrue(servidor.pedidos.isEmpty());
    }
}
