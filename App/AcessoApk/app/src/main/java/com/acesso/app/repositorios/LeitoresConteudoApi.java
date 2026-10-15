package com.acesso.app.repositorios;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Converte o JSON da API do Site (Site/Backend) nos modelos do app e os modelos no corpo
 * das requisições. Não usa nada do Android, então é testado só com JUnit.
 *
 * Formatos conferidos no código do backend: VagaService.listar / buscarPorEmpresaAutenticada,
 * PostagemService.listar e decorar, BuscaService.buscar, DashboardService.empresa e
 * paginacao.js (envelope {total, pagina, limite, totalPaginas, <chave>[]}).
 */
final class LeitoresConteudoApi {

    private LeitoresConteudoApi() {
    }

    /** GET /vagas e GET /vagas/minhas: { vagas: [...] }. */
    static List<Vaga> vagas(JsonObject json) {
        List<Vaga> lista = new ArrayList<>();
        for (JsonElement item : lista(json, "vagas")) {
            if (item.isJsonObject()) {
                lista.add(vaga(item.getAsJsonObject()));
            }
        }
        return lista;
    }

    static Vaga vaga(JsonObject json) {
        Vaga vaga = new Vaga();
        vaga.id = texto(json, "id");
        vaga.titulo = texto(json, "titulo");
        vaga.descricao = texto(json, "descricao");
        vaga.modalidade = texto(json, "modalidade");
        vaga.contrato = texto(json, "contrato");
        vaga.publicoAlvo = texto(json, "publicoAlvo");
        vaga.cidade = texto(json, "cidade");
        vaga.estado = texto(json, "estado");
        vaga.status = texto(json, "status");
        vaga.totalCandidaturas = inteiro(json, "totalCandidaturas");
        for (JsonElement recurso : lista(json, "recursosAcessibilidade")) {
            if (recurso.isJsonPrimitive()) {
                vaga.recursosAcessibilidade.add(recurso.getAsString());
            }
        }
        JsonObject empresa = objeto(json, "empresa");
        if (empresa != null) {
            vaga.nomeEmpresa = nomeDaEmpresa(empresa);
            vaga.empresaVerificada = booleano(empresa, "empresaVerificada");
        }
        return vaga;
    }

    /** GET /postagens: { postagens: [...] }. {@code agora} em milissegundos, para "há 2 horas". */
    static List<Publicacao> publicacoes(JsonObject json, long agora) {
        List<Publicacao> lista = new ArrayList<>();
        for (JsonElement item : lista(json, "postagens")) {
            if (item.isJsonObject()) {
                lista.add(publicacao(item.getAsJsonObject(), agora));
            }
        }
        return lista;
    }

    static Publicacao publicacao(JsonObject json, long agora) {
        Publicacao publicacao = new Publicacao();
        publicacao.id = texto(json, "id");
        publicacao.conteudo = texto(json, "conteudo");
        publicacao.quando = TempoRelativo.formatar(texto(json, "criadoEm"), agora);
        publicacao.curtidas = inteiro(json, "totalCurtidas");
        publicacao.comentarios = inteiro(json, "totalComentarios");
        JsonObject autor = objeto(json, "usuario");
        if (autor != null) {
            publicacao.nomeAutor = texto(autor, "nome");
            publicacao.tipoAutor = TipoConta.doCodigo(texto(autor, "tipoUsuario"));
        }
        return publicacao;
    }

    /**
     * GET /busca?tipo=...: { resultados: { usuarios|empresas|vagas: [...] } }.
     * O app tem Pessoas, Empresas e Vagas; "usuarios" também traz contas de empresa, que ficam
     * de fora de Pessoas porque já aparecem em Empresas.
     */
    static List<ItemBusca> busca(JsonObject json, ItemBusca.Categoria categoria) {
        List<ItemBusca> itens = new ArrayList<>();
        JsonObject resultados = objeto(json, "resultados");
        if (resultados == null) {
            return itens;
        }
        for (JsonElement elemento : lista(resultados, chaveDaBusca(categoria))) {
            if (!elemento.isJsonObject()) {
                continue;
            }
            JsonObject item = elemento.getAsJsonObject();
            ItemBusca resultado = new ItemBusca();
            resultado.categoria = categoria;
            resultado.id = texto(item, "id");
            switch (categoria) {
                case PESSOAS:
                    if (TipoConta.EMPRESA.getCodigo().equals(texto(item, "tipoUsuario"))) {
                        continue;
                    }
                    resultado.titulo = texto(item, "nome");
                    JsonObject candidato = objeto(item, "candidato");
                    resultado.subtitulo = candidato == null ? null
                            : juntar(texto(candidato, "tituloProfissional"),
                            local(texto(candidato, "cidade"), texto(candidato, "estado")));
                    break;
                case EMPRESAS:
                    resultado.titulo = nomeDaEmpresa(item);
                    resultado.subtitulo = juntar(texto(item, "setor"),
                            local(texto(item, "cidade"), texto(item, "estado")));
                    break;
                default:
                    resultado.titulo = texto(item, "titulo");
                    JsonObject empresa = objeto(item, "empresa");
                    resultado.subtitulo = juntar(empresa == null ? null : nomeDaEmpresa(empresa),
                            texto(item, "cidade"));
                    break;
            }
            itens.add(resultado);
        }
        return itens;
    }

    /** Valor de {@code tipo} na query de GET /busca (BuscaService.TIPOS). */
    static String tipoDaBusca(ItemBusca.Categoria categoria) {
        return chaveDaBusca(categoria);
    }

    private static String chaveDaBusca(ItemBusca.Categoria categoria) {
        switch (categoria) {
            case PESSOAS:
                return "usuarios";
            case EMPRESAS:
                return "empresas";
            default:
                return "vagas";
        }
    }

    /**
     * GET /dashboard/empresa ({ metricas }) junto com GET /vagas/minhas.
     * No painel, "vagasPublicadas" é o campo "vagas" da API (a contagem total).
     */
    static ResumoEmpresa resumoEmpresa(JsonObject dashboard, JsonObject vagasMinhas) {
        ResumoEmpresa resumo = new ResumoEmpresa();
        JsonObject metricas = objeto(dashboard, "metricas");
        if (metricas != null) {
            resumo.vagasPublicadas = inteiro(metricas, "vagas");
            resumo.vagasAbertas = inteiro(metricas, "vagasAbertas");
            resumo.candidaturas = inteiro(metricas, "candidaturas");
            resumo.seguidores = inteiro(metricas, "seguidores");
        }
        resumo.vagas = vagas(vagasMinhas);
        return resumo;
    }

    /**
     * GET /candidatos/me ({ candidato: { tituloProfissional, cidade, estado, usuario: { nome } } }) ou
     * GET /empresas/me ({ empresa: { nomeFantasia, razaoSocial, statusAprovacao, usuario: { nome } } }).
     * CPF, CNPJ, endereço, CEP e demais campos do cadastro são ignorados de propósito.
     */
    static PerfilConta perfil(JsonObject json, boolean empresa) {
        JsonObject dados = objeto(json, empresa ? "empresa" : "candidato");
        PerfilConta perfil = new PerfilConta();
        if (dados == null) {
            return perfil;
        }
        String nomeDaConta = texto(objeto(dados, "usuario"), "nome");
        if (empresa) {
            String nomeDaEmpresa = nomeDaEmpresa(dados);
            perfil.nome = nomeDaEmpresa == null || nomeDaEmpresa.trim().isEmpty() ? nomeDaConta : nomeDaEmpresa;
            perfil.statusEmpresa = texto(dados, "statusAprovacao");
        } else {
            perfil.nome = nomeDaConta;
            perfil.detalhe = juntar(texto(dados, "tituloProfissional"),
                    local(texto(dados, "cidade"), texto(dados, "estado")));
        }
        return perfil;
    }

    /** Corpo de POST /vagas. Campos vazios ficam de fora (a API usa os padrões dela). */
    static JsonObject corpoVaga(Vaga vaga) {
        JsonObject corpo = new JsonObject();
        adicionar(corpo, "titulo", vaga.titulo);
        adicionar(corpo, "descricao", vaga.descricao);
        adicionar(corpo, "modalidade", vaga.modalidade);
        adicionar(corpo, "contrato", vaga.contrato);
        adicionar(corpo, "publicoAlvo", vaga.publicoAlvo);
        adicionar(corpo, "cidade", vaga.cidade);
        adicionar(corpo, "estado", vaga.estado);
        adicionar(corpo, "status", vaga.status);
        if (vaga.recursosAcessibilidade != null && !vaga.recursosAcessibilidade.isEmpty()) {
            JsonArray recursos = new JsonArray();
            for (String recurso : vaga.recursosAcessibilidade) {
                recursos.add(recurso);
            }
            corpo.add("recursosAcessibilidade", recursos);
        }
        return corpo;
    }

    /** Corpo de POST /postagens. */
    static JsonObject corpoPostagem(String conteudo) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("conteudo", conteudo);
        return corpo;
    }

    // --- auxiliares de leitura tolerantes a campo ausente ou null ---

    private static String nomeDaEmpresa(JsonObject empresa) {
        String fantasia = texto(empresa, "nomeFantasia");
        return fantasia != null && !fantasia.trim().isEmpty() ? fantasia : texto(empresa, "razaoSocial");
    }

    private static String local(String cidade, String estado) {
        return juntar(cidade, estado, " - ");
    }

    private static String juntar(String a, String b) {
        return juntar(a, b, " · ");
    }

    private static String juntar(String a, String b, String separador) {
        boolean temA = a != null && !a.trim().isEmpty();
        boolean temB = b != null && !b.trim().isEmpty();
        if (temA && temB) {
            return a.trim() + separador + b.trim();
        }
        if (temA) {
            return a.trim();
        }
        return temB ? b.trim() : null;
    }

    private static void adicionar(JsonObject corpo, String chave, String valor) {
        if (valor != null && !valor.trim().isEmpty()) {
            corpo.addProperty(chave, valor);
        }
    }

    private static JsonArray lista(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        return elemento != null && elemento.isJsonArray() ? elemento.getAsJsonArray() : new JsonArray();
    }

    private static JsonObject objeto(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        return elemento != null && elemento.isJsonObject() ? elemento.getAsJsonObject() : null;
    }

    private static String texto(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        return elemento != null && elemento.isJsonPrimitive() ? elemento.getAsString() : null;
    }

    private static int inteiro(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        if (elemento == null || !elemento.isJsonPrimitive()) {
            return 0;
        }
        try {
            return elemento.getAsInt();
        } catch (NumberFormatException erro) {
            return 0;
        }
    }

    private static boolean booleano(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        return elemento != null && elemento.isJsonPrimitive() && elemento.getAsBoolean();
    }

    /** "há 2 horas", "ontem" etc. a partir do {@code criadoEm} ISO-8601 da API. */
    static final class TempoRelativo {

        private TempoRelativo() {
        }

        static String formatar(String iso, long agora) {
            if (iso == null) {
                return "";
            }
            long momento;
            try {
                momento = Instant.parse(iso).toEpochMilli();
            } catch (RuntimeException erro) {
                return "";
            }
            long minutos = Math.max(0, (agora - momento) / 60_000);
            if (minutos < 1) {
                return "agora mesmo";
            }
            if (minutos < 60) {
                return "há " + minutos + (minutos == 1 ? " minuto" : " minutos");
            }
            long horas = minutos / 60;
            if (horas < 24) {
                return "há " + horas + (horas == 1 ? " hora" : " horas");
            }
            long dias = horas / 24;
            if (dias == 1) {
                return "ontem";
            }
            if (dias < 30) {
                return "há " + dias + " dias";
            }
            long meses = dias / 30;
            if (meses < 12) {
                return "há " + meses + (meses == 1 ? " mês" : " meses");
            }
            long anos = meses / 12;
            return "há " + anos + (anos == 1 ? " ano" : " anos");
        }
    }
}
