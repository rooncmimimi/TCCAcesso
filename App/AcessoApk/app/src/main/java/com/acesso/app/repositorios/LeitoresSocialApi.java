package com.acesso.app.repositorios;

import static com.acesso.app.repositorios.LeitoresConteudoApi.booleano;
import static com.acesso.app.repositorios.LeitoresConteudoApi.inteiro;
import static com.acesso.app.repositorios.LeitoresConteudoApi.lista;
import static com.acesso.app.repositorios.LeitoresConteudoApi.objeto;
import static com.acesso.app.repositorios.LeitoresConteudoApi.texto;

import com.acesso.app.modelos.Comentario;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.TipoConta;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Leitura das respostas e corpos das requisições de comentários, seguir, edição de perfil e envio de
 * imagens. Formatos conferidos em ComentarioService, SeguidorService (resumo/resumoEmpresa),
 * UsuarioController (foto/capa), EmpresaController (logo/capa) e nos validadores de usuário, candidato e empresa.
 */
final class LeitoresSocialApi {

    private LeitoresSocialApi() {
    }

    /** Imagens de {@code anexos[]} de uma postagem (a API já devolve a URL assinada em {@code url}). */
    static List<Publicacao.Anexo> anexosDeImagem(JsonObject postagem) {
        List<Publicacao.Anexo> anexos = new ArrayList<>();
        for (JsonElement item : lista(postagem, "anexos")) {
            if (!item.isJsonObject()) {
                continue;
            }
            JsonObject dados = item.getAsJsonObject();
            String url = texto(dados, "url");
            if ("imagem".equals(texto(dados, "tipo")) && url != null && !url.isEmpty()) {
                Publicacao.Anexo anexo = new Publicacao.Anexo();
                anexo.id = texto(dados, "id");
                anexo.url = url;
                anexo.descricao = texto(dados, "descricao");
                anexos.add(anexo);
            }
        }
        return anexos;
    }

    /** GET /postagens/:id/comentarios: { comentarios: [{ ..., usuario, respostas: [...] }] }. */
    static List<Comentario> comentarios(JsonObject json, long agora) {
        List<Comentario> comentarios = new ArrayList<>();
        for (JsonElement item : lista(json, "comentarios")) {
            if (item.isJsonObject()) {
                comentarios.add(comentario(item.getAsJsonObject(), agora, true));
            }
        }
        return comentarios;
    }

    private static Comentario comentario(JsonObject json, long agora, boolean comRespostas) {
        Comentario comentario = new Comentario();
        comentario.id = texto(json, "id");
        comentario.texto = texto(json, "comentario");
        comentario.quando = LeitoresConteudoApi.TempoRelativo.formatar(texto(json, "criadoEm"), agora);
        comentario.editado = texto(json, "editadoEm") != null;
        JsonObject autor = objeto(json, "usuario");
        comentario.autorId = autor != null ? texto(autor, "id") : texto(json, "usuarioId");
        if (autor != null) {
            comentario.nomeAutor = texto(autor, "nome");
            comentario.tipoAutor = TipoConta.doCodigo(texto(autor, "tipoUsuario"));
            comentario.fotoAutorUrl = texto(autor, "fotoPerfil");
        }
        if (comRespostas) {
            for (JsonElement resposta : lista(json, "respostas")) {
                if (resposta.isJsonObject()) {
                    comentario.respostas.add(comentario(resposta.getAsJsonObject(), agora, false));
                }
            }
        }
        return comentario;
    }

    /** POST /postagens/:id/comentarios { comentario, comentarioPaiId? }. */
    static JsonObject corpoComentario(String texto, String comentarioPaiId) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("comentario", texto);
        if (comentarioPaiId != null && !comentarioPaiId.isEmpty()) {
            corpo.addProperty("comentarioPaiId", comentarioPaiId);
        }
        return corpo;
    }

    /** PUT /postagens/:id { conteudo }. */
    static JsonObject corpoEdicaoPostagem(String conteudo) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("conteudo", conteudo);
        return corpo;
    }

    /** GET /seguir/resumo/:usuarioId. */
    static ResumoSeguidores resumoPessoa(JsonObject json) {
        ResumoSeguidores resumo = new ResumoSeguidores();
        resumo.totalSeguidores = inteiro(json, "totalSeguidores");
        resumo.totalSeguindo = inteiro(json, "totalSeguindo");
        resumo.seguindo = booleano(json, "seguindoEsteUsuario");
        // Ausente = público (a API só manda false quando o perfil é privado).
        resumo.perfilPrivado = json.has("perfilPublico") && !booleano(json, "perfilPublico");
        resumo.solicitacaoPendente = booleano(json, "solicitacaoPendente");
        resumo.bloqueado = booleano(json, "bloqueado");
        return resumo;
    }

    /** GET /seguir/resumo/empresas/:empresaId. */
    static ResumoSeguidores resumoEmpresa(JsonObject json) {
        ResumoSeguidores resumo = new ResumoSeguidores();
        resumo.totalSeguidores = inteiro(json, "totalSeguidores");
        resumo.seguindo = booleano(json, "seguindoEstaEmpresa");
        return resumo;
    }

    /**
     * POST /seguir/usuarios/:id ou /seguir/empresas/:id: { seguindo, totalSeguidores }. O estado vem da
     * resposta; os outros campos do resumo seguem como estavam.
     */
    static ResumoSeguidores aposAlternar(JsonObject json, ResumoSeguidores anterior) {
        ResumoSeguidores resumo = new ResumoSeguidores();
        if (anterior != null) {
            resumo.totalSeguindo = anterior.totalSeguindo;
            resumo.perfilPrivado = anterior.perfilPrivado;
            resumo.bloqueado = anterior.bloqueado;
        }
        resumo.seguindo = booleano(json, "seguindo");
        resumo.totalSeguidores = inteiro(json, "totalSeguidores");
        return resumo;
    }

    /** POST /seguir/solicitacoes/:id: { seguindo, solicitacaoCriada, solicitacaoPendente } (perfil privado). */
    static ResumoSeguidores aposSolicitar(JsonObject json, ResumoSeguidores anterior) {
        ResumoSeguidores resumo = new ResumoSeguidores();
        if (anterior != null) {
            resumo.totalSeguidores = anterior.totalSeguidores;
            resumo.totalSeguindo = anterior.totalSeguindo;
            resumo.perfilPrivado = anterior.perfilPrivado;
            resumo.bloqueado = anterior.bloqueado;
        }
        resumo.totalSeguidores = json.has("totalSeguidores") ? inteiro(json, "totalSeguidores") : resumo.totalSeguidores;
        resumo.seguindo = booleano(json, "seguindo");
        resumo.solicitacaoPendente = booleano(json, "solicitacaoPendente");
        return resumo;
    }

    /** PUT /usuarios/:id: só o nome da conta (os campos sensíveis a API recusa). */
    static JsonObject corpoUsuario(EdicaoPerfil edicao) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("nome", edicao.nome);
        return corpo;
    }

    /**
     * PUT /candidatos/:id ou /empresas/:id. A API ignora campo vazio (o validador usa
     * {@code optional falsy}), então apagar um texto exige enviar string vazia; o Service grava o que
     * recebe. Estado vai em maiúsculas (sigla).
     */
    static JsonObject corpoRegistro(EdicaoPerfil edicao) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("cidade", vazioSeNulo(edicao.cidade));
        corpo.addProperty("estado", vazioSeNulo(edicao.estado).toUpperCase(java.util.Locale.ROOT));
        if (edicao.tipoConta == TipoConta.EMPRESA) {
            corpo.addProperty("nomeFantasia", vazioSeNulo(edicao.nome));
            corpo.addProperty("setor", vazioSeNulo(edicao.setor));
            corpo.addProperty("descricao", vazioSeNulo(edicao.sobre));
            corpo.addProperty("culturaInclusiva", vazioSeNulo(edicao.culturaInclusiva));
            // Site vazio nunca é enviado: o validador exige URL válida quando há valor.
            if (edicao.site != null && !edicao.site.trim().isEmpty()) {
                corpo.addProperty("site", edicao.site.trim());
            }
        } else {
            corpo.addProperty("tituloProfissional", vazioSeNulo(edicao.tituloProfissional));
            corpo.addProperty("biografia", vazioSeNulo(edicao.sobre));
        }
        return corpo;
    }

    /** Resposta de PATCH /usuarios/:id/foto|capa ({ usuario }) ou /empresas/:id/logo|capa ({ empresa }). */
    static String urlEnviada(JsonObject json, String objeto, String campo) {
        JsonObject dados = objeto(json, objeto);
        String url = texto(dados, campo);
        if (url == null || url.isEmpty()) {
            throw new ExecutorHttp.ErroAmigavel("O servidor não confirmou o envio da imagem. Tente de novo.");
        }
        return url;
    }

    private static String vazioSeNulo(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
