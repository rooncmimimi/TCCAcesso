package com.acesso.app.repositorios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.TipoConta;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;

import java.time.Instant;
import java.util.List;

/** Leitura das imagens (feed e perfil) e dos dados de edição, sem Android. */
public class LeitoresSocialApiTeste {

    private static JsonObject json(String texto) {
        return JsonParser.parseString(texto).getAsJsonObject();
    }

    private static final long AGORA = Instant.parse("2026-10-14T12:00:00.000Z").toEpochMilli();

    @Test
    public void publicacaoLeFotoDoAutorEApenasImagensComOTextoAlternativo() {
        JsonObject postagem = json("{\"postagens\":[{\"id\":\"p1\",\"conteudo\":\"Olá\",\"criadoEm\":\"2026-10-14T11:00:00.000Z\","
                + "\"editadoEm\":\"2026-10-14T11:30:00.000Z\",\"usuario\":{\"id\":\"u1\",\"nome\":\"Ana\","
                + "\"fotoPerfil\":\"https://cdn.test/ana.jpg\",\"tipoUsuario\":\"candidato\"},"
                + "\"anexos\":[{\"id\":\"a1\",\"tipo\":\"imagem\",\"url\":\"https://cdn.test/a1?token=x\",\"descricao\":\"Equipe em reunião\"},"
                + "{\"id\":\"a2\",\"tipo\":\"video\",\"url\":\"https://cdn.test/v.mp4\"},"
                + "{\"id\":\"a3\",\"tipo\":\"imagem\",\"url\":null},"
                + "{\"id\":\"a4\",\"tipo\":\"imagem\",\"url\":\"https://cdn.test/a4\"}]}]}");

        List<Publicacao> lista = LeitoresConteudoApi.publicacoes(postagem, AGORA);

        Publicacao publicacao = lista.get(0);
        assertEquals("https://cdn.test/ana.jpg", publicacao.fotoAutorUrl);
        assertTrue(publicacao.editada);
        assertEquals(2, publicacao.anexos.size());
        assertEquals("Equipe em reunião", publicacao.anexos.get(0).descricao);
        assertNull(publicacao.anexos.get(1).descricao);
    }

    @Test
    public void publicacaoSemAnexosNemEdicaoTemListaVazia() {
        JsonObject postagem = json("{\"postagens\":[{\"id\":\"p1\",\"conteudo\":\"Oi\",\"usuario\":{\"id\":\"u1\"}}]}");

        Publicacao publicacao = LeitoresConteudoApi.publicacoes(postagem, AGORA).get(0);

        assertTrue(publicacao.anexos.isEmpty());
        assertEquals(false, publicacao.editada);
        assertNull(publicacao.fotoAutorUrl);
    }

    @Test
    public void perfilDePessoaLeFotoCapaEOsCamposDeEdicao() {
        JsonObject resposta = json("{\"candidato\":{\"id\":\"cand-1\",\"usuarioId\":\"user-1\",\"tituloProfissional\":\"Analista\","
                + "\"biografia\":\"Bio\",\"cidade\":\"Recife\",\"estado\":\"PE\",\"usuario\":{\"id\":\"user-1\",\"nome\":\"Ana Souza\","
                + "\"fotoPerfil\":\"https://cdn.test/f.jpg\",\"capaPerfil\":\"https://cdn.test/c.jpg\"}}}");

        PerfilConta perfil = LeitoresConteudoApi.perfil(resposta, false);

        assertEquals("cand-1", perfil.registroId);
        assertEquals("user-1", perfil.usuarioId);
        assertEquals("https://cdn.test/f.jpg", perfil.fotoUrl);
        assertEquals("https://cdn.test/c.jpg", perfil.capaUrl);
        assertEquals("Ana Souza", perfil.nomeEditavel);
        assertEquals("Analista", perfil.tituloProfissional);
        assertEquals("Recife", perfil.cidade);
        assertEquals("PE", perfil.estado);
        assertEquals("Analista · Recife - PE", perfil.detalhe);
    }

    @Test
    public void perfilDeEmpresaUsaLogoECapaDaEmpresaENomeFantasiaParaEditar() {
        JsonObject resposta = json("{\"empresa\":{\"id\":\"emp-1\",\"usuarioId\":\"user-9\",\"razaoSocial\":\"Exemplo Ltda\","
                + "\"nomeFantasia\":null,\"setor\":\"Tecnologia\",\"cidade\":\"São Paulo\",\"estado\":\"SP\","
                + "\"logo\":\"/uploads/empresas/l.jpg\",\"capa\":\"https://cdn.test/e.jpg\",\"usuario\":{\"id\":\"user-9\","
                + "\"nome\":\"Conta Exemplo\",\"fotoPerfil\":\"https://cdn.test/ignorada.jpg\"}}}");

        PerfilConta perfil = LeitoresConteudoApi.perfil(resposta, true);

        assertEquals("emp-1", perfil.registroId);
        assertEquals("/uploads/empresas/l.jpg", perfil.fotoUrl);
        assertEquals("https://cdn.test/e.jpg", perfil.capaUrl);
        // O nome exibido cai na razão social; o campo editável fica vazio para não gravar a razão social como fantasia.
        assertEquals("Exemplo Ltda", perfil.nome);
        assertNull(perfil.nomeEditavel);
        assertEquals("Tecnologia", perfil.setor);
    }
}
