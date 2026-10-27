package com.acesso.app.repositorios;

import com.acesso.app.modelos.Comentario;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.SessaoUsuario;

import java.util.List;

/**
 * Interações da rede: comentários, edição e exclusão das próprias publicações, seguir, edição do perfil e
 * envio de foto e capa. Cada método indica a rota da API do Site que o atende. Fora da fonte "api",
 * FabricaRepositorios entrega {@link RepositorioSocialPendente} (aviso de integração pendente).
 */
public interface RepositorioSocial {

    /** Qual imagem do perfil está sendo trocada. */
    enum Imagem {
        /** PATCH /usuarios/:usuarioId/foto (campo "foto"). */
        FOTO_PERFIL,
        /** PATCH /usuarios/:usuarioId/capa (campo "capa"). */
        CAPA_PERFIL,
        /** PATCH /empresas/:empresaId/logo (campo "logo"); só empresa aprovada. */
        LOGO_EMPRESA,
        /** PATCH /empresas/:empresaId/capa (campo "capa"); só empresa aprovada. */
        CAPA_EMPRESA
    }

    /** GET /api/postagens/:id/comentarios */
    void listarComentarios(SessaoUsuario sessao, String publicacaoId, RetornoRepositorio<List<Comentario>> retorno);

    /** POST /api/postagens/:id/comentarios { comentario, comentarioPaiId? } */
    void comentar(SessaoUsuario sessao, String publicacaoId, String texto, String comentarioPaiId,
                  RetornoRepositorio<Void> retorno);

    /** DELETE /api/comentarios/:id (autor ou administrador). */
    void excluirComentario(SessaoUsuario sessao, String comentarioId, RetornoRepositorio<Void> retorno);

    /** PUT /api/postagens/:id { conteudo } (só o autor). */
    void editarPublicacao(SessaoUsuario sessao, String publicacaoId, String conteudo, RetornoRepositorio<Void> retorno);

    /** DELETE /api/postagens/:id (autor ou administrador). */
    void excluirPublicacao(SessaoUsuario sessao, String publicacaoId, RetornoRepositorio<Void> retorno);

    /** GET /api/seguir/resumo/:usuarioId (pessoa) ou /api/seguir/resumo/empresas/:empresaId (empresa). */
    void carregarResumoSeguidores(SessaoUsuario sessao, PerfilConta alvo, RetornoRepositorio<ResumoSeguidores> retorno);

    /**
     * Seguir ou deixar de seguir. Pessoa: POST /seguir/usuarios/:id (deixar de seguir), DELETE
     * /seguir/solicitacoes/:id (cancelar pedido) ou POST /seguir/solicitacoes/:id (seguir; em perfil
     * privado vira pedido). Empresa: POST /seguir/empresas/:id (só candidatos).
     */
    void alternarSeguir(SessaoUsuario sessao, PerfilConta alvo, ResumoSeguidores atual,
                        RetornoRepositorio<ResumoSeguidores> retorno);

    /** PUT /api/usuarios/:id (nome, só pessoa) e PUT /api/candidatos/:id ou /api/empresas/:id. */
    void atualizarPerfil(SessaoUsuario sessao, EdicaoPerfil edicao, RetornoRepositorio<Void> retorno);

    /**
     * Envia uma imagem JPEG já reduzida e devolve a URL guardada pelo servidor.
     *
     * @param destinoId id da conta (foto e capa da pessoa) ou da empresa (logo e capa da empresa).
     */
    void enviarImagem(SessaoUsuario sessao, Imagem imagem, String destinoId, byte[] jpeg,
                      RetornoRepositorio<String> retorno);
}
