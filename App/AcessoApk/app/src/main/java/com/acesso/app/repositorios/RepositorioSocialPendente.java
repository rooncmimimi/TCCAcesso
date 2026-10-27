package com.acesso.app.repositorios;

import com.acesso.app.modelos.Comentario;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.SessaoUsuario;

import java.util.List;

/** Fora da fonte "api" as interações da rede não existem: toda operação responde "integração pendente". */
public class RepositorioSocialPendente implements RepositorioSocial {

    private static final String DETALHE = "esta ação depende da API do ACESSO. Nada foi alterado.";

    @Override
    public void listarComentarios(SessaoUsuario sessao, String publicacaoId,
                                  RetornoRepositorio<List<Comentario>> retorno) {
        RepositorioConteudoPendente.avisar(retorno,
                "os comentários virão da API do ACESSO (GET /api/postagens/:id/comentarios).");
    }

    @Override
    public void comentar(SessaoUsuario sessao, String publicacaoId, String texto, String comentarioPaiId,
                         RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void excluirComentario(SessaoUsuario sessao, String comentarioId, RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void editarPublicacao(SessaoUsuario sessao, String publicacaoId, String conteudo,
                                 RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void excluirPublicacao(SessaoUsuario sessao, String publicacaoId, RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void carregarResumoSeguidores(SessaoUsuario sessao, PerfilConta alvo,
                                         RetornoRepositorio<ResumoSeguidores> retorno) {
        RepositorioConteudoPendente.avisar(retorno,
                "os seguidores virão da API do ACESSO (GET /api/seguir/resumo/:id).");
    }

    @Override
    public void alternarSeguir(SessaoUsuario sessao, PerfilConta alvo, ResumoSeguidores atual,
                               RetornoRepositorio<ResumoSeguidores> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void atualizarPerfil(SessaoUsuario sessao, EdicaoPerfil edicao, RetornoRepositorio<Void> retorno) {
        RepositorioConteudoPendente.avisar(retorno, DETALHE);
    }

    @Override
    public void enviarImagem(SessaoUsuario sessao, Imagem imagem, String destinoId, byte[] jpeg,
                             RetornoRepositorio<String> retorno) {
        RepositorioConteudoPendente.avisar(retorno, "o envio de imagens depende da API do ACESSO. Nada foi enviado.");
    }
}
