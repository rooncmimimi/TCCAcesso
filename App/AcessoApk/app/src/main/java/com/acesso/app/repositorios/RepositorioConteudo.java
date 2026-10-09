package com.acesso.app.repositorios;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.Vaga;

import java.util.List;

/**
 * Conteúdo das abas (feed, vagas, painel da empresa, pesquisa e publicação).
 * Cada método indica a rota da API do Site que vai alimentá-lo. Enquanto essa
 * integração não existe, FabricaRepositorios entrega {@link RepositorioConteudoPendente},
 * que avisa na tela que o conteúdo depende da API (nada é inventado como se fosse real).
 */
public interface RepositorioConteudo {

    /** GET /api/postagens (feed paginado). */
    void listarPublicacoes(SessaoUsuario sessao, RetornoRepositorio<List<Publicacao>> retorno);

    /** GET /api/vagas?q=&modalidade=&publicoAlvo= (mesmos filtros da página de vagas do Site). */
    void listarVagas(SessaoUsuario sessao, String busca, String modalidade, String publicoAlvo,
                     RetornoRepositorio<List<Vaga>> retorno);

    /** GET /api/dashboard/empresa e GET /api/vagas/minhas (painel da empresa). */
    void carregarResumoEmpresa(SessaoUsuario sessao, RetornoRepositorio<ResumoEmpresa> retorno);

    /** GET /api/busca?q=&tipo= */
    void buscar(SessaoUsuario sessao, String termo, ItemBusca.Categoria categoria,
                RetornoRepositorio<List<ItemBusca>> retorno);

    /** POST /api/postagens { conteudo } */
    void publicar(SessaoUsuario sessao, String conteudo, RetornoRepositorio<Void> retorno);

    /** POST /api/vagas (só empresa aprovada) */
    void criarVaga(SessaoUsuario sessao, Vaga vaga, RetornoRepositorio<Void> retorno);
}
