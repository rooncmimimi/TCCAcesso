package com.acesso.app.repositorios;

import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.Candidatura;
import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.modelos.PerfilConta;
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

    @Override
    public void carregarPerfil(SessaoUsuario sessao, RetornoRepositorio<PerfilConta> retorno) {
        pendente(retorno, "Os dados do perfil virão da API do ACESSO "
                + "(GET /api/perfil/candidatos/usuario/:id ou /api/empresas/me).");
    }

    @Override
    public void carregarPerfilDeUsuario(SessaoUsuario sessao, String usuarioId, RetornoRepositorio<PerfilConta> retorno) {
        pendente(retorno, "Os perfis virão da API do ACESSO (GET /api/perfil/usuario/:id).");
    }

    @Override
    public void obterVaga(SessaoUsuario sessao, String vagaId, RetornoRepositorio<Vaga> retorno) {
        pendente(retorno, "Os detalhes da vaga virão da API do ACESSO (GET /api/vagas/:id).");
    }

    @Override
    public void candidatar(SessaoUsuario sessao, String vagaId, String mensagem, RetornoRepositorio<Void> retorno) {
        pendente(retorno, "A candidatura depende da API do ACESSO (POST /api/vagas/:id/candidaturas). Nada foi enviado.");
    }

    @Override
    public void listarCandidaturas(SessaoUsuario sessao, RetornoRepositorio<List<Candidatura>> retorno) {
        pendente(retorno, "As candidaturas virão da API do ACESSO (GET /api/candidaturas/minhas).");
    }

    @Override
    public void curtir(SessaoUsuario sessao, String publicacaoId, RetornoRepositorio<Publicacao.Curtida> retorno) {
        pendente(retorno, "Curtir depende da API do ACESSO (POST /api/postagens/:id/curtidas).");
    }

    private <T> void pendente(RetornoRepositorio<T> retorno, String detalhe) {
        avisar(retorno, detalhe);
    }

    /** Responde "integração pendente" na thread principal (usado também por mensagens e notificações). */
    static <T> void avisar(RetornoRepositorio<T> retorno, String detalhe) {
        responder(() -> retorno.aoFalhar(PREFIXO + ": " + detalhe));
    }

    static void responder(Runnable resposta) {
        new Handler(Looper.getMainLooper()).post(resposta);
    }
}
