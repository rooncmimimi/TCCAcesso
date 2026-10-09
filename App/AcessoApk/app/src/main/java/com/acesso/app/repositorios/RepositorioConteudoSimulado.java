package com.acesso.app.repositorios;

import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * SIMULAÇÃO - DADOS FICTÍCIOS.
 *
 * Conteúdo de demonstração para ver as telas preenchidas sem servidor. Só é usado
 * junto com a autenticação simulada (build de debug) e as telas mostram o aviso
 * "Modo demonstração". Nomes de pessoas e empresas são inventados.
 */
public class RepositorioConteudoSimulado implements RepositorioConteudo {

    private static final long ATRASO_MILLIS = 600;

    private final Handler threadPrincipal = new Handler(Looper.getMainLooper());

    @Override
    public void listarPublicacoes(SessaoUsuario sessao, RetornoRepositorio<List<Publicacao>> retorno) {
        responder(() -> retorno.aoConcluir(Arrays.asList(
                publicacao("Empresa Exemplo Ltda", TipoConta.EMPRESA, "há 1 hora", 24, 3,
                        "Estamos com vagas abertas para analista de suporte, com intérprete de Libras "
                                + "nas entrevistas e jornada adaptável. Confira na aba Vagas!"),
                publicacao("Joana Exemplo", TipoConta.PESSOA, "há 3 horas", 12, 5,
                        "Terminei hoje o curso de acessibilidade digital. Obrigada a todo mundo que indicou!"),
                publicacao("Carlos Demonstração", TipoConta.PESSOA, "ontem", 40, 8,
                        "Aos 54 anos, voltei ao mercado como coordenador de logística. Nunca é tarde."))));
    }

    @Override
    public void listarVagas(SessaoUsuario sessao, String busca, String modalidade, String publicoAlvo,
                            RetornoRepositorio<List<Vaga>> retorno) {
        responder(() -> {
            List<Vaga> filtradas = new ArrayList<>();
            for (Vaga vaga : vagasDemonstracao()) {
                if (combina(vaga, busca, modalidade, publicoAlvo)) {
                    filtradas.add(vaga);
                }
            }
            retorno.aoConcluir(filtradas);
        });
    }

    @Override
    public void carregarResumoEmpresa(SessaoUsuario sessao, RetornoRepositorio<ResumoEmpresa> retorno) {
        responder(() -> {
            ResumoEmpresa resumo = new ResumoEmpresa();
            resumo.vagas = vagasDemonstracao().subList(0, 2);
            resumo.vagasPublicadas = 2;
            resumo.vagasAbertas = 2;
            resumo.candidaturas = 17;
            resumo.seguidores = 58;
            retorno.aoConcluir(resumo);
        });
    }

    @Override
    public void buscar(SessaoUsuario sessao, String termo, ItemBusca.Categoria categoria,
                       RetornoRepositorio<List<ItemBusca>> retorno) {
        responder(() -> {
            List<ItemBusca> todos = Arrays.asList(
                    item(ItemBusca.Categoria.PESSOAS, "Joana Exemplo", "Desenvolvedora front-end · São Paulo - SP"),
                    item(ItemBusca.Categoria.PESSOAS, "Carlos Demonstração", "Coordenador de logística · Recife - PE"),
                    item(ItemBusca.Categoria.EMPRESAS, "Empresa Exemplo Ltda", "Tecnologia · Empresa verificada"),
                    item(ItemBusca.Categoria.EMPRESAS, "Loja Fictícia S.A.", "Varejo · Curitiba - PR"),
                    item(ItemBusca.Categoria.VAGAS, "Analista de suporte", "Empresa Exemplo Ltda · Remoto"),
                    item(ItemBusca.Categoria.VAGAS, "Assistente administrativo", "Loja Fictícia S.A. · Presencial"));
            List<ItemBusca> encontrados = new ArrayList<>();
            String termoMinusculo = termo.toLowerCase(Locale.ROOT);
            for (ItemBusca item : todos) {
                if (item.categoria == categoria
                        && (item.titulo + " " + item.subtitulo).toLowerCase(Locale.ROOT).contains(termoMinusculo)) {
                    encontrados.add(item);
                }
            }
            retorno.aoConcluir(encontrados);
        });
    }

    @Override
    public void publicar(SessaoUsuario sessao, String conteudo, RetornoRepositorio<Void> retorno) {
        responder(() -> retorno.aoConcluir(null));
    }

    @Override
    public void criarVaga(SessaoUsuario sessao, Vaga vaga, RetornoRepositorio<Void> retorno) {
        responder(() -> retorno.aoConcluir(null));
    }

    // ---------------------------------------------------------------------

    private static List<Vaga> vagasDemonstracao() {
        return Arrays.asList(
                vaga("Analista de suporte", "Empresa Exemplo Ltda", true, "remoto", "clt", "pcd", null, null, 9,
                        "Atendimento a clientes por chat e e-mail, com equipamentos e softwares acessíveis.",
                        "interprete_libras", "ferramentas_digitais_acessiveis", "jornada_adaptavel"),
                vaga("Desenvolvedor(a) Android júnior", "Empresa Exemplo Ltda", true, "hibrido", "clt", "geral",
                        "São Paulo", "SP", 8,
                        "Desenvolvimento de apps nativos em Java com foco em acessibilidade (TalkBack).",
                        "tecnologia_assistiva", "elevador_rampa"),
                vaga("Assistente administrativo", "Loja Fictícia S.A.", false, "presencial", "clt", "cinquenta_mais",
                        "Curitiba", "PR", 0,
                        "Rotinas administrativas, organização de documentos e apoio ao financeiro.",
                        "ambiente_fisico_acessivel", "banheiro_adaptado"));
    }

    static boolean combina(Vaga vaga, String busca, String modalidade, String publicoAlvo) {
        if (busca != null && !busca.trim().isEmpty()) {
            String texto = (vaga.titulo + " " + vaga.nomeEmpresa + " " + vaga.descricao).toLowerCase(Locale.ROOT);
            if (!texto.contains(busca.trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        if (modalidade != null && !modalidade.equals(vaga.modalidade)) {
            return false;
        }
        return publicoAlvo == null || publicoAlvo.equals(vaga.publicoAlvo);
    }

    private static Vaga vaga(String titulo, String empresa, boolean verificada, String modalidade, String contrato,
                             String publicoAlvo, String cidade, String estado, int candidaturas, String descricao,
                             String... recursos) {
        Vaga vaga = new Vaga();
        vaga.id = titulo;
        vaga.titulo = titulo;
        vaga.nomeEmpresa = empresa;
        vaga.empresaVerificada = verificada;
        vaga.modalidade = modalidade;
        vaga.contrato = contrato;
        vaga.publicoAlvo = publicoAlvo;
        vaga.cidade = cidade;
        vaga.estado = estado;
        vaga.status = "aberta";
        vaga.descricao = descricao;
        vaga.totalCandidaturas = candidaturas;
        vaga.recursosAcessibilidade = Arrays.asList(recursos);
        return vaga;
    }

    private static Publicacao publicacao(String autor, TipoConta tipo, String quando, int curtidas, int comentarios,
                                         String conteudo) {
        Publicacao publicacao = new Publicacao();
        publicacao.id = autor + quando;
        publicacao.nomeAutor = autor;
        publicacao.tipoAutor = tipo;
        publicacao.quando = quando;
        publicacao.curtidas = curtidas;
        publicacao.comentarios = comentarios;
        publicacao.conteudo = conteudo;
        return publicacao;
    }

    private static ItemBusca item(ItemBusca.Categoria categoria, String titulo, String subtitulo) {
        ItemBusca item = new ItemBusca();
        item.id = titulo;
        item.categoria = categoria;
        item.titulo = titulo;
        item.subtitulo = subtitulo;
        return item;
    }

    private void responder(Runnable resposta) {
        threadPrincipal.postDelayed(resposta, ATRASO_MILLIS);
    }
}
