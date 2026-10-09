package com.acesso.app.repositorios;

import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.Vaga;

import java.util.List;

/**
 * Ponto onde as chamadas de conteúdo à API do Site serão implementadas.
 * Por enquanto toda operação responde "integração pendente", com a rota que
 * vai atendê-la, e a tela mostra esse aviso no lugar da lista.
 * Para implementar: siga o RepositorioAutenticacaoApi (ExecutorHttp + ClienteApi
 * + TradutorErrosApi) e troque esta classe em FabricaRepositorios.
 */
public class RepositorioConteudoPendente implements RepositorioConteudo {

    /** Começo de toda mensagem desta classe, para a tela reconhecer que não é um erro de rede. */
    public static final String PREFIXO = "Integração pendente";

    private final Handler threadPrincipal = new Handler(Looper.getMainLooper());

    @Override
    public void listarPublicacoes(SessaoUsuario sessao, RetornoRepositorio<List<Publicacao>> retorno) {
        pendente(retorno, "As publicações da comunidade virão da API do ACESSO (GET /api/postagens).");
    }

    @Override
    public void listarVagas(SessaoUsuario sessao, String busca, String modalidade, String publicoAlvo,
                            RetornoRepositorio<List<Vaga>> retorno) {
        pendente(retorno, "As vagas virão da API do ACESSO (GET /api/vagas), com os mesmos filtros do site.");
    }

    @Override
    public void carregarResumoEmpresa(SessaoUsuario sessao, RetornoRepositorio<ResumoEmpresa> retorno) {
        pendente(retorno, "Os números e as vagas da empresa virão da API do ACESSO "
                + "(GET /api/dashboard/empresa e GET /api/vagas/minhas).");
    }

    @Override
    public void buscar(SessaoUsuario sessao, String termo, ItemBusca.Categoria categoria,
                       RetornoRepositorio<List<ItemBusca>> retorno) {
        pendente(retorno, "A pesquisa vai consultar a API do ACESSO (GET /api/busca).");
    }

    @Override
    public void publicar(SessaoUsuario sessao, String conteudo, RetornoRepositorio<Void> retorno) {
        pendente(retorno, "Sua publicação está pronta, mas o envio depende da API do ACESSO "
                + "(POST /api/postagens). Nada foi publicado.");
    }

    @Override
    public void criarVaga(SessaoUsuario sessao, Vaga vaga, RetornoRepositorio<Void> retorno) {
        pendente(retorno, "A vaga está pronta, mas o envio depende da API do ACESSO "
                + "(POST /api/vagas). Nada foi publicado.");
    }

    private <T> void pendente(RetornoRepositorio<T> retorno, String detalhe) {
        threadPrincipal.post(() -> retorno.aoFalhar(PREFIXO + ": " + detalhe));
    }
}
