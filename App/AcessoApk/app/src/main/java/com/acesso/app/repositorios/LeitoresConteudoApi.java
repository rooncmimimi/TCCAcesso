package com.acesso.app.repositorios;

import com.acesso.app.modelos.Candidatura;
import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.Mensagem;
import com.acesso.app.modelos.Notificacao;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.PermissaoConversa;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Converte o JSON da API do Site (Site/Backend) nos modelos do app e os modelos no corpo
 * das requisições. Não usa nada do Android, então é testado só com JUnit.
 *
 * Formatos conferidos no código do backend: VagaService.listar / buscarPorEmpresaAutenticada,
 * PostagemService.listar e decorar, BuscaService.buscar, DashboardService.empresa,
 * PerfilCandidatoService.perfilCompleto (com candidatoPrivacidade.js), EmpresaService.buscarPorUsuarioPublico,
 * CandidaturaService.listarDoCandidato, ConversaService, NotificacaoService e
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
        vaga.requisitos = texto(json, "requisitos");
        vaga.beneficios = texto(json, "beneficios");
        vaga.salario = moeda(texto(json, "salario"));
        vaga.cargaHoraria = texto(json, "cargaHoraria");
        JsonObject empresa = objeto(json, "empresa");
        if (empresa != null) {
            vaga.nomeEmpresa = nomeDaEmpresa(empresa);
            vaga.empresaVerificada = booleano(empresa, "empresaVerificada");
            vaga.empresaUsuarioId = texto(empresa, "usuarioId");
            vaga.logoEmpresaUrl = texto(empresa, "logo");
        }
        return vaga;
    }

    /** GET /vagas/:id: { vaga: {..., empresa: {..., usuarioId}} }. */
    static Vaga vagaDetalhe(JsonObject json, long agora) {
        JsonObject dados = objeto(json, "vaga");
        if (dados == null) {
            throw new ExecutorHttp.ErroAmigavel("Vaga não encontrada.");
        }
        Vaga vaga = vaga(dados);
        vaga.quando = TempoRelativo.formatar(texto(dados, "criadoEm"), agora);
        return vaga;
    }

    /** DECIMAL(10,2) chega como texto ("3500.00"): vira "R$ 3.500,00". Valor inválido ou zero fica de fora. */
    static String moeda(String valor) {
        if (valor == null || valor.trim().isEmpty()) {
            return null;
        }
        try {
            BigDecimal numero = new BigDecimal(valor.trim());
            if (numero.signum() <= 0) {
                return null;
            }
            // O formato brasileiro separa "R$" do valor com espaço não separável; troca por espaço comum.
            return NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(numero).replace(' ', ' ');
        } catch (NumberFormatException erro) {
            return null;
        }
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
        publicacao.curtidoPorMim = booleano(json, "curtidoPorMim");
        publicacao.editada = texto(json, "editadoEm") != null;
        publicacao.anexos = LeitoresSocialApi.anexosDeImagem(json);
        JsonObject autor = objeto(json, "usuario");
        if (autor != null) {
            publicacao.autorId = texto(autor, "id");
            publicacao.nomeAutor = texto(autor, "nome");
            publicacao.tipoAutor = TipoConta.doCodigo(texto(autor, "tipoUsuario"));
            publicacao.fotoAutorUrl = texto(autor, "fotoPerfil");
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
                    resultado.usuarioId = texto(item, "id");
                    resultado.titulo = texto(item, "nome");
                    JsonObject candidato = objeto(item, "candidato");
                    resultado.subtitulo = candidato == null ? null
                            : juntar(texto(candidato, "tituloProfissional"),
                            local(texto(candidato, "cidade"), texto(candidato, "estado")));
                    break;
                case EMPRESAS:
                    resultado.usuarioId = texto(item, "usuarioId");
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
     * Perfil de pessoa ou de empresa.
     * Pessoa: GET /perfil/candidatos/usuario/:id ({ candidato: { usuarioId, tituloProfissional, biografia, cidade,
     * estado, usuario: { id, nome }, experiencias[], formacoes[], habilidades[] } }).
     * Empresa: GET /empresas/me ou /empresas/usuario/:id ({ empresa: { usuarioId, nomeFantasia, razaoSocial,
     * descricao, culturaInclusiva, setor, porte, site, cidade, estado, statusAprovacao, usuario: { nome }, vagas[] } }).
     * CPF, CNPJ, endereço, CEP, currículo e necessidades de acessibilidade são ignorados de propósito.
     */
    static PerfilConta perfil(JsonObject json, boolean empresa) {
        JsonObject dados = objeto(json, empresa ? "empresa" : "candidato");
        PerfilConta perfil = new PerfilConta();
        perfil.tipoConta = empresa ? TipoConta.EMPRESA : TipoConta.PESSOA;
        if (dados == null) {
            return perfil;
        }
        JsonObject usuario = objeto(dados, "usuario");
        String nomeDaConta = texto(usuario, "nome");
        perfil.usuarioId = texto(dados, "usuarioId") != null ? texto(dados, "usuarioId") : texto(usuario, "id");
        perfil.registroId = texto(dados, "id");
        perfil.cidade = texto(dados, "cidade");
        perfil.estado = texto(dados, "estado");
        String local = local(texto(dados, "cidade"), texto(dados, "estado"));
        if (empresa) {
            String nomeDaEmpresa = nomeDaEmpresa(dados);
            perfil.nome = nomeDaEmpresa == null || nomeDaEmpresa.trim().isEmpty() ? nomeDaConta : nomeDaEmpresa;
            perfil.nomeEditavel = texto(dados, "nomeFantasia");
            perfil.fotoUrl = texto(dados, "logo");
            perfil.capaUrl = texto(dados, "capa");
            perfil.setor = texto(dados, "setor");
            perfil.statusEmpresa = texto(dados, "statusAprovacao");
            perfil.empresaVerificada = booleano(dados, "empresaVerificada");
            perfil.detalhe = juntar(texto(dados, "setor"), local);
            perfil.sobre = texto(dados, "descricao");
            perfil.culturaInclusiva = texto(dados, "culturaInclusiva");
            perfil.site = texto(dados, "site");
            perfil.porte = texto(dados, "porte");
            for (JsonElement item : lista(dados, "vagas")) {
                if (item.isJsonObject()) {
                    Vaga vaga = vaga(item.getAsJsonObject());
                    vaga.nomeEmpresa = perfil.nome;
                    vaga.empresaVerificada = perfil.empresaVerificada;
                    vaga.empresaUsuarioId = perfil.usuarioId;
                    vaga.logoEmpresaUrl = perfil.fotoUrl;
                    perfil.vagasAbertas.add(vaga);
                }
            }
        } else {
            perfil.nome = nomeDaConta;
            perfil.nomeEditavel = nomeDaConta;
            perfil.fotoUrl = texto(usuario, "fotoPerfil");
            perfil.capaUrl = texto(usuario, "capaPerfil");
            perfil.tituloProfissional = texto(dados, "tituloProfissional");
            perfil.detalhe = juntar(texto(dados, "tituloProfissional"), local);
            perfil.sobre = texto(dados, "biografia");
            for (JsonElement item : lista(dados, "habilidades")) {
                String nome = item.isJsonObject() ? texto(item.getAsJsonObject(), "nome") : null;
                if (nome != null && !nome.trim().isEmpty()) {
                    perfil.habilidades.add(nome.trim());
                }
            }
            for (JsonElement item : lista(dados, "experiencias")) {
                if (item.isJsonObject()) {
                    JsonObject experiencia = item.getAsJsonObject();
                    perfil.experiencias.add(itemCurriculo(texto(experiencia, "cargo"),
                            juntar(texto(experiencia, "empresa"), texto(experiencia, "local")),
                            periodo(texto(experiencia, "dataInicio"), texto(experiencia, "dataFim"),
                                    booleano(experiencia, "atual")),
                            texto(experiencia, "descricao")));
                }
            }
            for (JsonElement item : lista(dados, "formacoes")) {
                if (item.isJsonObject()) {
                    JsonObject formacao = item.getAsJsonObject();
                    perfil.formacoes.add(itemCurriculo(texto(formacao, "curso"), texto(formacao, "instituicao"),
                            periodo(texto(formacao, "dataInicio"), texto(formacao, "dataFim"),
                                    booleano(formacao, "emAndamento")),
                            texto(formacao, "descricao")));
                }
            }
        }
        return perfil;
    }

    /** GET /perfil/usuario/:id: { usuario: { id, nome, tipoUsuario } }. Só o tipo da conta interessa. */
    static TipoConta tipoDoUsuario(JsonObject json) {
        JsonObject usuario = objeto(json, "usuario");
        if (usuario == null) {
            throw new ExecutorHttp.ErroAmigavel("Perfil não encontrado.");
        }
        return TipoConta.doCodigo(texto(usuario, "tipoUsuario"));
    }

    private static PerfilConta.ItemCurriculo itemCurriculo(String titulo, String subtitulo, String periodo,
                                                           String descricao) {
        PerfilConta.ItemCurriculo item = new PerfilConta.ItemCurriculo();
        item.titulo = titulo;
        item.subtitulo = subtitulo;
        item.periodo = periodo;
        item.descricao = descricao;
        return item;
    }

    private static final String[] MESES = {
            "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"};

    /** "2020-03-01" e "2022-11-30" -> "mar/2020 – nov/2022"; em andamento -> "mar/2020 – atual". */
    static String periodo(String inicio, String fim, boolean atual) {
        String textoInicio = mesAno(inicio);
        String textoFim = atual ? "atual" : mesAno(fim);
        if (textoInicio == null) {
            return textoFim;
        }
        return textoFim == null ? textoInicio : textoInicio + " – " + textoFim;
    }

    private static String mesAno(String data) {
        if (data == null || data.length() < 10) {
            return null;
        }
        try {
            LocalDate dia = LocalDate.parse(data.substring(0, 10));
            return MESES[dia.getMonthValue() - 1] + "/" + dia.getYear();
        } catch (RuntimeException erro) {
            return null;
        }
    }

    /** GET /candidaturas/minhas: { candidaturas: [{ id, status, criadoEm, vaga: { id, titulo, empresa } }] }. */
    static List<Candidatura> candidaturas(JsonObject json, long agora) {
        List<Candidatura> lista = new ArrayList<>();
        for (JsonElement item : lista(json, "candidaturas")) {
            if (!item.isJsonObject()) {
                continue;
            }
            JsonObject dados = item.getAsJsonObject();
            Candidatura candidatura = new Candidatura();
            candidatura.id = texto(dados, "id");
            candidatura.status = texto(dados, "status");
            candidatura.quando = TempoRelativo.formatar(texto(dados, "criadoEm"), agora);
            JsonObject vaga = objeto(dados, "vaga");
            candidatura.vagaId = vaga != null ? texto(vaga, "id") : texto(dados, "vagaId");
            if (vaga != null) {
                candidatura.tituloVaga = texto(vaga, "titulo");
                JsonObject empresa = objeto(vaga, "empresa");
                candidatura.nomeEmpresa = empresa == null ? null : nomeDaEmpresa(empresa);
            }
            lista.add(candidatura);
        }
        return lista;
    }

    /** Corpo de POST /vagas/:vagaId/candidaturas. A mensagem é opcional (até 2000 caracteres). */
    static JsonObject corpoCandidatura(String mensagem) {
        JsonObject corpo = new JsonObject();
        adicionar(corpo, "mensagem", mensagem);
        return corpo;
    }

    /** POST /postagens/:id/curtidas: { curtido, totalCurtidas }. */
    static Publicacao.Curtida curtida(JsonObject json) {
        Publicacao.Curtida curtida = new Publicacao.Curtida();
        curtida.curtido = booleano(json, "curtido");
        curtida.total = inteiro(json, "totalCurtidas");
        return curtida;
    }

    // --- Mensagens (ConversaService) ---

    /** GET /conversas: { conversas: [{ id, usuarioAId, usuarioBId, usuarioA, usuarioB, ultimaMensagemPrevia, ... }] }. */
    static List<Conversa> conversas(JsonObject json, String meuId, long agora) {
        List<Conversa> lista = new ArrayList<>();
        for (JsonElement item : lista(json, "conversas")) {
            if (item.isJsonObject()) {
                lista.add(conversa(item.getAsJsonObject(), meuId, agora));
            }
        }
        return lista;
    }

    /** POST /conversas e GET /conversas/:id: { conversa: {...} }. */
    static Conversa conversaUnica(JsonObject json, String meuId, long agora) {
        JsonObject dados = objeto(json, "conversa");
        if (dados == null) {
            throw new ExecutorHttp.ErroAmigavel("Conversa não encontrada.");
        }
        return conversa(dados, meuId, agora);
    }

    /**
     * Uma conversa do ponto de vista de {@code meuId}: o "outro" é o participante que não é a conta logada.
     * O par fica em ordem canônica no banco (usuarioAId &lt; usuarioBId), então a conta logada pode estar
     * em qualquer um dos lados.
     */
    static Conversa conversa(JsonObject json, String meuId, long agora) {
        Conversa conversa = new Conversa();
        conversa.id = texto(json, "id");
        boolean euSouA = meuId != null && meuId.equalsIgnoreCase(texto(json, "usuarioAId"));
        conversa.outroUsuarioId = texto(json, euSouA ? "usuarioBId" : "usuarioAId");
        JsonObject outro = objeto(json, euSouA ? "usuarioB" : "usuarioA");
        if (outro != null) {
            conversa.tipoOutro = TipoConta.doCodigo(texto(outro, "tipoUsuario"));
            JsonObject empresa = objeto(outro, "empresa");
            String nomeEmpresa = empresa == null ? null : nomeDaEmpresa(empresa);
            conversa.nomeOutro = nomeEmpresa != null && !nomeEmpresa.trim().isEmpty() ? nomeEmpresa : texto(outro, "nome");
        }
        conversa.previa = texto(json, "ultimaMensagemPrevia");
        conversa.quando = TempoRelativo.formatar(texto(json, "ultimaMensagemEm"), agora);
        conversa.naoLidas = inteiro(json, "mensagensNaoLidas");
        return conversa;
    }

    /** GET /conversas/:id/mensagens: { mensagens: [...] } em ordem de envio (a mais antiga primeiro). */
    static List<Mensagem> mensagens(JsonObject json) {
        List<Mensagem> lista = new ArrayList<>();
        for (JsonElement item : lista(json, "mensagens")) {
            if (item.isJsonObject()) {
                lista.add(mensagem(item.getAsJsonObject()));
            }
        }
        return lista;
    }

    /** POST /conversas/:id/mensagens: { mensagem: {...} }. */
    static Mensagem mensagemEnviada(JsonObject json) {
        JsonObject dados = objeto(json, "mensagem");
        if (dados == null) {
            throw new ExecutorHttp.ErroAmigavel("A mensagem não foi confirmada pelo servidor.");
        }
        return mensagem(dados);
    }

    static Mensagem mensagem(JsonObject json) {
        Mensagem mensagem = new Mensagem();
        mensagem.id = texto(json, "id");
        mensagem.remetenteId = texto(json, "remetenteId");
        mensagem.conteudo = texto(json, "conteudo");
        mensagem.lida = booleano(json, "lida");
        mensagem.enviadaEm = instante(texto(json, "criadoEm"));
        return mensagem;
    }

    /** Corpo de POST /conversas/:id/mensagens (1 a 2000 caracteres). */
    static JsonObject corpoMensagem(String conteudo) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("conteudo", conteudo);
        return corpo;
    }

    /** Corpo de POST /conversas: abre (ou recupera) a conversa com {@code usuarioId}. */
    static JsonObject corpoConversa(String usuarioId) {
        JsonObject corpo = new JsonObject();
        corpo.addProperty("usuarioId", usuarioId);
        return corpo;
    }

    /** GET /conversas/pode-iniciar/:usuarioId: { permitido, motivo? }. */
    static PermissaoConversa permissao(JsonObject json) {
        PermissaoConversa permissao = new PermissaoConversa();
        permissao.permitido = booleano(json, "permitido");
        permissao.motivo = texto(json, "motivo");
        return permissao;
    }

    /** GET /conversas/nao-lidas e GET /notificacoes/nao-lidas: { naoLidas }. */
    static Integer naoLidas(JsonObject json) {
        return inteiro(json, "naoLidas");
    }

    /** Envelope de paginacao.js. */
    static int totalPaginas(JsonObject json) {
        return inteiro(json, "totalPaginas");
    }

    // --- Notificações (NotificacaoService) ---

    /** GET /notificacoes: { notificacoes: [{ id, tipo, subtipo, titulo, descricao, lida, criadoEm, ator }] }. */
    static List<Notificacao> notificacoes(JsonObject json, long agora) {
        List<Notificacao> lista = new ArrayList<>();
        for (JsonElement item : lista(json, "notificacoes")) {
            if (!item.isJsonObject()) {
                continue;
            }
            JsonObject dados = item.getAsJsonObject();
            Notificacao notificacao = new Notificacao();
            notificacao.id = texto(dados, "id");
            notificacao.tipo = texto(dados, "tipo");
            notificacao.subtipo = texto(dados, "subtipo");
            notificacao.titulo = texto(dados, "titulo");
            notificacao.descricao = texto(dados, "descricao");
            notificacao.lida = booleano(dados, "lida");
            notificacao.quando = TempoRelativo.formatar(texto(dados, "criadoEm"), agora);
            notificacao.entidadeTipo = texto(dados, "entidadeTipo");
            notificacao.entidadeId = texto(dados, "entidadeId");
            notificacao.atorId = texto(dados, "atorId");
            notificacao.atorNome = texto(objeto(dados, "ator"), "nome");
            lista.add(notificacao);
        }
        return lista;
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

    private static long instante(String iso) {
        if (iso == null) {
            return 0;
        }
        try {
            return Instant.parse(iso).toEpochMilli();
        } catch (RuntimeException erro) {
            return 0;
        }
    }

    private static String nomeDaEmpresa(JsonObject empresa) {
        String fantasia = texto(empresa, "nomeFantasia");
        return fantasia != null && !fantasia.trim().isEmpty() ? fantasia : texto(empresa, "razaoSocial");
    }

    static String local(String cidade, String estado) {
        return juntar(cidade, estado, " - ");
    }

    static String juntar(String a, String b) {
        return juntar(a, b, " · ");
    }

    static String juntar(String a, String b, String separador) {
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

    static JsonArray lista(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        return elemento != null && elemento.isJsonArray() ? elemento.getAsJsonArray() : new JsonArray();
    }

    static JsonObject objeto(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        return elemento != null && elemento.isJsonObject() ? elemento.getAsJsonObject() : null;
    }

    static String texto(JsonObject json, String chave) {
        JsonElement elemento = json == null ? null : json.get(chave);
        return elemento != null && elemento.isJsonPrimitive() ? elemento.getAsString() : null;
    }

    static int inteiro(JsonObject json, String chave) {
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

    static boolean booleano(JsonObject json, String chave) {
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
