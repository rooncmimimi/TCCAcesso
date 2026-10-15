package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;

import java.time.Instant;
import java.util.List;

/** JSON no formato da API do Site (conferido no código do backend) convertido nos modelos do app. */
public class LeitoresConteudoApiTeste {

    private static final long AGORA = Instant.parse("2026-10-14T12:00:00.000Z").toEpochMilli();

    private static JsonObject json(String texto) {
        return JsonParser.parseString(texto).getAsJsonObject();
    }

    @Test
    public void vagaLeEmpresaRecursosELocal() {
        List<Vaga> vagas = LeitoresConteudoApi.vagas(json("{\"sucesso\":true,\"total\":1,\"pagina\":1,\"vagas\":[{"
                + "\"id\":\"v1\",\"titulo\":\"Analista de suporte\",\"descricao\":\"Atendimento remoto\","
                + "\"modalidade\":\"remoto\",\"contrato\":\"clt\",\"publicoAlvo\":\"pcd\",\"cidade\":null,"
                + "\"estado\":\"SP\",\"status\":\"aberta\",\"recursosAcessibilidade\":[\"interprete_libras\"],"
                + "\"empresa\":{\"id\":\"e1\",\"nomeFantasia\":\"Empresa Falsa\",\"razaoSocial\":\"Falsa Ltda\","
                + "\"empresaVerificada\":true}}]}"));

        assertEquals(1, vagas.size());
        Vaga vaga = vagas.get(0);
        assertEquals("v1", vaga.id);
        assertEquals("Empresa Falsa", vaga.nomeEmpresa);
        assertTrue(vaga.empresaVerificada);
        assertEquals("pcd", vaga.publicoAlvo);
        assertNull(vaga.cidade);
        assertEquals("SP", vaga.estado);
        assertEquals(1, vaga.recursosAcessibilidade.size());
        assertEquals("interprete_libras", vaga.recursosAcessibilidade.get(0));
    }

    @Test
    public void vagaSemNomeFantasiaUsaARazaoSocial() {
        Vaga vaga = LeitoresConteudoApi.vaga(json("{\"id\":\"v1\",\"empresa\":{\"nomeFantasia\":\"\","
                + "\"razaoSocial\":\"Falsa Ltda\"}}"));
        assertEquals("Falsa Ltda", vaga.nomeEmpresa);
        assertFalse(vaga.empresaVerificada);
    }

    @Test
    public void vagaDoPainelTrazOTotalDeCandidaturas() {
        List<Vaga> vagas = LeitoresConteudoApi.vagas(json("{\"vagas\":[{\"id\":\"v1\",\"titulo\":\"X\","
                + "\"totalCandidaturas\":7}]}"));
        assertEquals(7, vagas.get(0).totalCandidaturas);
    }

    @Test
    public void listaAusenteViraListaVazia() {
        assertTrue(LeitoresConteudoApi.vagas(json("{\"sucesso\":true}")).isEmpty());
        assertTrue(LeitoresConteudoApi.publicacoes(json("{}"), AGORA).isEmpty());
        assertTrue(LeitoresConteudoApi.busca(json("{}"), ItemBusca.Categoria.VAGAS).isEmpty());
    }

    @Test
    public void publicacaoLeAutorContagensEData() {
        List<Publicacao> lista = LeitoresConteudoApi.publicacoes(json("{\"postagens\":[{"
                + "\"id\":\"p1\",\"conteudo\":\"Olá\",\"criadoEm\":\"2026-10-14T10:00:00.000Z\","
                + "\"totalCurtidas\":3,\"curtidoPorMim\":false,\"totalComentarios\":2,"
                + "\"usuario\":{\"id\":\"u1\",\"nome\":\"Ana\",\"tipoUsuario\":\"candidato\"}}]}"), AGORA);

        Publicacao p = lista.get(0);
        assertEquals("Ana", p.nomeAutor);
        assertEquals(TipoConta.PESSOA, p.tipoAutor);
        assertEquals("Olá", p.conteudo);
        assertEquals(3, p.curtidas);
        assertEquals(2, p.comentarios);
        assertEquals("há 2 horas", p.quando);
    }

    @Test
    public void publicacaoSoComAnexoTemConteudoNulo() {
        Publicacao p = LeitoresConteudoApi.publicacao(json("{\"id\":\"p1\",\"conteudo\":null,"
                + "\"usuario\":{\"nome\":\"Empresa\",\"tipoUsuario\":\"empresa\"}}"), AGORA);
        assertNull(p.conteudo);
        assertEquals(TipoConta.EMPRESA, p.tipoAutor);
        assertEquals("", p.quando);
    }

    @Test
    public void tempoRelativo() {
        assertEquals("agora mesmo", LeitoresConteudoApi.TempoRelativo.formatar("2026-10-14T11:59:40.000Z", AGORA));
        assertEquals("há 1 minuto", LeitoresConteudoApi.TempoRelativo.formatar("2026-10-14T11:59:00.000Z", AGORA));
        assertEquals("há 30 minutos", LeitoresConteudoApi.TempoRelativo.formatar("2026-10-14T11:30:00.000Z", AGORA));
        assertEquals("há 1 hora", LeitoresConteudoApi.TempoRelativo.formatar("2026-10-14T11:00:00.000Z", AGORA));
        assertEquals("ontem", LeitoresConteudoApi.TempoRelativo.formatar("2026-10-13T11:00:00.000Z", AGORA));
        assertEquals("há 5 dias", LeitoresConteudoApi.TempoRelativo.formatar("2026-10-09T12:00:00.000Z", AGORA));
        assertEquals("há 2 meses", LeitoresConteudoApi.TempoRelativo.formatar("2026-08-10T12:00:00.000Z", AGORA));
        assertEquals("há 1 ano", LeitoresConteudoApi.TempoRelativo.formatar("2025-09-01T12:00:00.000Z", AGORA));
        // Relógio do celular atrasado em relação ao servidor: nunca "há -3 minutos".
        assertEquals("agora mesmo", LeitoresConteudoApi.TempoRelativo.formatar("2026-10-14T12:03:00.000Z", AGORA));
        assertEquals("", LeitoresConteudoApi.TempoRelativo.formatar("ontem à noite", AGORA));
        assertEquals("", LeitoresConteudoApi.TempoRelativo.formatar(null, AGORA));
    }

    @Test
    public void buscaDePessoasIgnoraContasDeEmpresa() {
        List<ItemBusca> itens = LeitoresConteudoApi.busca(json("{\"resultados\":{\"usuarios\":["
                + "{\"id\":\"u1\",\"nome\":\"Ana\",\"tipoUsuario\":\"candidato\","
                + "\"candidato\":{\"tituloProfissional\":\"Analista\",\"cidade\":\"Recife\",\"estado\":\"PE\"}},"
                + "{\"id\":\"u2\",\"nome\":\"Empresa Falsa\",\"tipoUsuario\":\"empresa\",\"candidato\":null}]}}"),
                ItemBusca.Categoria.PESSOAS);

        assertEquals(1, itens.size());
        assertEquals("Ana", itens.get(0).titulo);
        assertEquals("Analista · Recife - PE", itens.get(0).subtitulo);
        assertEquals(ItemBusca.Categoria.PESSOAS, itens.get(0).categoria);
    }

    @Test
    public void buscaDeEmpresasEVagas() {
        List<ItemBusca> empresas = LeitoresConteudoApi.busca(json("{\"resultados\":{\"empresas\":["
                + "{\"id\":\"e1\",\"nomeFantasia\":\"Empresa Falsa\",\"setor\":\"Tecnologia\",\"cidade\":\"Recife\","
                + "\"estado\":null}]}}"), ItemBusca.Categoria.EMPRESAS);
        assertEquals("Empresa Falsa", empresas.get(0).titulo);
        assertEquals("Tecnologia · Recife", empresas.get(0).subtitulo);

        List<ItemBusca> vagas = LeitoresConteudoApi.busca(json("{\"resultados\":{\"vagas\":["
                + "{\"id\":\"v1\",\"titulo\":\"Analista\",\"cidade\":\"Recife\","
                + "\"empresa\":{\"nomeFantasia\":\"Empresa Falsa\"}}]}}"), ItemBusca.Categoria.VAGAS);
        assertEquals("Analista", vagas.get(0).titulo);
        assertEquals("Empresa Falsa · Recife", vagas.get(0).subtitulo);
    }

    @Test
    public void tipoDaBuscaUsaOsValoresDaApi() {
        assertEquals("usuarios", LeitoresConteudoApi.tipoDaBusca(ItemBusca.Categoria.PESSOAS));
        assertEquals("empresas", LeitoresConteudoApi.tipoDaBusca(ItemBusca.Categoria.EMPRESAS));
        assertEquals("vagas", LeitoresConteudoApi.tipoDaBusca(ItemBusca.Categoria.VAGAS));
    }

    @Test
    public void resumoDaEmpresaJuntaMetricasEVagas() {
        ResumoEmpresa resumo = LeitoresConteudoApi.resumoEmpresa(
                json("{\"sucesso\":true,\"metricas\":{\"vagas\":4,\"vagasAbertas\":3,\"candidaturas\":9,"
                        + "\"candidaturasPendentes\":2,\"postagens\":1,\"seguidores\":12}}"),
                json("{\"vagas\":[{\"id\":\"v1\",\"titulo\":\"X\",\"totalCandidaturas\":5}]}"));

        assertEquals(4, resumo.vagasPublicadas);
        assertEquals(3, resumo.vagasAbertas);
        assertEquals(9, resumo.candidaturas);
        assertEquals(12, resumo.seguidores);
        assertEquals(1, resumo.vagas.size());
    }

    @Test
    public void corpoDaVagaOmiteCamposVaziosEEnviaOsNomesDaApi() {
        Vaga vaga = new Vaga();
        vaga.titulo = "Analista de suporte";
        vaga.descricao = "Atendimento a clientes";
        vaga.modalidade = "remoto";
        vaga.contrato = "clt";
        vaga.publicoAlvo = "geral";
        vaga.cidade = null;
        vaga.estado = "";
        vaga.status = "aberta";
        vaga.recursosAcessibilidade.add("interprete_libras");

        JsonObject corpo = LeitoresConteudoApi.corpoVaga(vaga);

        assertEquals("Analista de suporte", corpo.get("titulo").getAsString());
        assertEquals("geral", corpo.get("publicoAlvo").getAsString());
        assertFalse(corpo.has("cidade"));
        assertFalse(corpo.has("estado"));
        assertEquals("interprete_libras", corpo.getAsJsonArray("recursosAcessibilidade").get(0).getAsString());
    }

    @Test
    public void corpoDaVagaSemRecursosNaoEnviaALista() {
        Vaga vaga = new Vaga();
        vaga.titulo = "Analista de suporte";
        assertFalse(LeitoresConteudoApi.corpoVaga(vaga).has("recursosAcessibilidade"));
    }

    @Test
    public void perfilDaPessoaLeNomeCargoECidade() {
        com.acesso.app.modelos.PerfilConta perfil = LeitoresConteudoApi.perfil(json("{\"sucesso\":true,\"candidato\":{"
                + "\"id\":\"c1\",\"cpf\":\"000.000.000-00\",\"tituloProfissional\":\"Analista\",\"cidade\":\"Recife\","
                + "\"estado\":\"PE\",\"usuario\":{\"nome\":\"Ana Falsa\",\"email\":\"ana@fake.test\"}}}"), false);

        assertEquals("Ana Falsa", perfil.nome);
        assertEquals("Analista · Recife - PE", perfil.detalhe);
        assertNull(perfil.statusEmpresa);
    }

    @Test
    public void perfilDaPessoaSemCamposOpcionaisNaoTemDetalhe() {
        com.acesso.app.modelos.PerfilConta perfil = LeitoresConteudoApi.perfil(json("{\"candidato\":{"
                + "\"tituloProfissional\":null,\"cidade\":\"\",\"usuario\":{\"nome\":\"Ana Falsa\"}}}"), false);
        assertEquals("Ana Falsa", perfil.nome);
        assertNull(perfil.detalhe);
    }

    @Test
    public void perfilDaEmpresaUsaNomeFantasiaEOStatus() {
        com.acesso.app.modelos.PerfilConta perfil = LeitoresConteudoApi.perfil(json("{\"sucesso\":true,\"empresa\":{"
                + "\"cnpj\":\"00.000.000/0000-00\",\"nomeFantasia\":\"Empresa Falsa\",\"razaoSocial\":\"Falsa Ltda\","
                + "\"statusAprovacao\":\"aprovada\",\"usuario\":{\"nome\":\"Responsável Falso\"}}}"), true);

        assertEquals("Empresa Falsa", perfil.nome);
        assertEquals("aprovada", perfil.statusEmpresa);
        assertNull(perfil.detalhe);
    }

    @Test
    public void perfilDaEmpresaSemNomeFantasiaUsaRazaoSocialOuONomeDaConta() {
        assertEquals("Falsa Ltda", LeitoresConteudoApi.perfil(json("{\"empresa\":{\"nomeFantasia\":\" \","
                + "\"razaoSocial\":\"Falsa Ltda\",\"usuario\":{\"nome\":\"Resp\"}}}"), true).nome);
        assertEquals("Resp", LeitoresConteudoApi.perfil(json("{\"empresa\":{\"usuario\":{\"nome\":\"Resp\"}}}"), true).nome);
    }

    @Test
    public void perfilSemOObjetoEsperadoVemVazio() {
        com.acesso.app.modelos.PerfilConta perfil = LeitoresConteudoApi.perfil(json("{\"sucesso\":true}"), false);
        assertNull(perfil.nome);
        assertNull(perfil.detalhe);
        assertNull(perfil.statusEmpresa);
    }

    @Test
    public void corpoDaPostagemTemSoOConteudo() {
        JsonObject corpo = LeitoresConteudoApi.corpoPostagem("Olá, pessoal");
        assertEquals(1, corpo.size());
        assertEquals("Olá, pessoal", corpo.get("conteudo").getAsString());
    }
}
