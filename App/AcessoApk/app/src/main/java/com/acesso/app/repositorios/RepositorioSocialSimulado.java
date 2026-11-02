package com.acesso.app.repositorios;

import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.Comentario;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * SIMULAÇÃO - DADOS FICTÍCIOS. Comentários, edição, seguir e edição do perfil em memória, para ver as telas
 * funcionando no modo demonstração (build de debug). Nada é enviado nem salvo: ao fechar o app, tudo volta ao início.
 */
public class RepositorioSocialSimulado implements RepositorioSocial {

    private static final long ATRASO_MILLIS = 400;

    /** Id da publicação fictícia escrita pela própria conta de demonstração (para testar editar e excluir). */
    static final String PUBLICACAO_PROPRIA = "demonstracao-propria";
    static final String REGISTRO_PROPRIO = "demonstracao-registro";

    private static final Map<String, List<Comentario>> COMENTARIOS = new HashMap<>();
    private static final Map<String, String> CONTEUDO_EDITADO = new HashMap<>();
    private static final Set<String> EXCLUIDAS = new HashSet<>();
    private static final Set<String> SEGUIDOS = new HashSet<>();
    private static EdicaoPerfil perfilEditado;

    private final Handler threadPrincipal = new Handler(Looper.getMainLooper());

    static String conteudoEditado(String publicacaoId) {
        return CONTEUDO_EDITADO.get(publicacaoId);
    }

    static boolean excluida(String publicacaoId) {
        return EXCLUIDAS.contains(publicacaoId);
    }

    static EdicaoPerfil perfilEditado() {
        return perfilEditado;
    }

    static int totalComentarios(String publicacaoId) {
        List<Comentario> lista = COMENTARIOS.get(publicacaoId);
        if (lista == null) {
            return -1;
        }
        int total = 0;
        for (Comentario comentario : lista) {
            total += 1 + comentario.respostas.size();
        }
        return total;
    }

    @Override
    public void listarComentarios(SessaoUsuario sessao, String publicacaoId,
                                  RetornoRepositorio<List<Comentario>> retorno) {
        responder(() -> {
            List<Comentario> lista = COMENTARIOS.get(publicacaoId);
            if (lista == null) {
                lista = new ArrayList<>();
                lista.add(comentarioFicticio("c1", "Carlos Demonstração", "Parabéns! Isso é muito inspirador.", "há 1 hora"));
                COMENTARIOS.put(publicacaoId, lista);
            }
            retorno.aoConcluir(new ArrayList<>(lista));
        });
    }

    @Override
    public void comentar(SessaoUsuario sessao, String publicacaoId, String texto, String comentarioPaiId,
                         RetornoRepositorio<Void> retorno) {
        responder(() -> {
            List<Comentario> lista = COMENTARIOS.get(publicacaoId);
            if (lista == null) {
                lista = new ArrayList<>();
                COMENTARIOS.put(publicacaoId, lista);
            }
            Comentario novo = comentarioFicticio("c" + System.nanoTime(),
                    sessao != null ? sessao.getNome() : "Você", texto, "agora mesmo");
            novo.autorId = sessao != null ? sessao.getIdUsuario() : null;
            Comentario pai = comentarioPaiId == null ? null : buscar(lista, comentarioPaiId);
            if (pai != null) {
                pai.respostas.add(novo);
            } else {
                lista.add(novo);
            }
            retorno.aoConcluir(null);
        });
    }

    @Override
    public void excluirComentario(SessaoUsuario sessao, String comentarioId, RetornoRepositorio<Void> retorno) {
        responder(() -> {
            for (List<Comentario> lista : COMENTARIOS.values()) {
                lista.removeIf(c -> c.id.equals(comentarioId));
                for (Comentario comentario : lista) {
                    comentario.respostas.removeIf(c -> c.id.equals(comentarioId));
                }
            }
            retorno.aoConcluir(null);
        });
    }

    @Override
    public void editarPublicacao(SessaoUsuario sessao, String publicacaoId, String conteudo,
                                 RetornoRepositorio<Void> retorno) {
        responder(() -> {
            CONTEUDO_EDITADO.put(publicacaoId, conteudo);
            retorno.aoConcluir(null);
        });
    }

    @Override
    public void excluirPublicacao(SessaoUsuario sessao, String publicacaoId, RetornoRepositorio<Void> retorno) {
        responder(() -> {
            EXCLUIDAS.add(publicacaoId);
            retorno.aoConcluir(null);
        });
    }

    @Override
    public void carregarResumoSeguidores(SessaoUsuario sessao, PerfilConta alvo,
                                         RetornoRepositorio<ResumoSeguidores> retorno) {
        responder(() -> retorno.aoConcluir(resumo(alvo)));
    }

    @Override
    public void alternarSeguir(SessaoUsuario sessao, PerfilConta alvo, ResumoSeguidores atual,
                               RetornoRepositorio<ResumoSeguidores> retorno) {
        responder(() -> {
            String chave = chave(alvo);
            if (!SEGUIDOS.remove(chave)) {
                SEGUIDOS.add(chave);
            }
            retorno.aoConcluir(resumo(alvo));
        });
    }

    @Override
    public void atualizarPerfil(SessaoUsuario sessao, EdicaoPerfil edicao, RetornoRepositorio<Void> retorno) {
        responder(() -> {
            perfilEditado = edicao;
            retorno.aoConcluir(null);
        });
    }

    @Override
    public void enviarImagem(SessaoUsuario sessao, Imagem imagem, String destinoId, byte[] jpeg,
                             RetornoRepositorio<String> retorno) {
        responder(() -> retorno.aoFalhar("No modo demonstração a imagem não é enviada: não há servidor para guardá-la."));
    }

    private static ResumoSeguidores resumo(PerfilConta alvo) {
        ResumoSeguidores resumo = new ResumoSeguidores();
        resumo.seguindo = SEGUIDOS.contains(chave(alvo));
        resumo.totalSeguidores = 12 + (resumo.seguindo ? 1 : 0);
        resumo.totalSeguindo = alvo != null && alvo.tipoConta == TipoConta.EMPRESA ? 0 : 7;
        return resumo;
    }

    private static String chave(PerfilConta alvo) {
        return alvo == null ? "" : String.valueOf(alvo.usuarioId) + "/" + alvo.tipoConta;
    }

    private static Comentario buscar(List<Comentario> lista, String id) {
        for (Comentario comentario : lista) {
            if (comentario.id.equals(id)) {
                return comentario;
            }
        }
        return null;
    }

    private static Comentario comentarioFicticio(String id, String autor, String texto, String quando) {
        Comentario comentario = new Comentario();
        comentario.id = id;
        comentario.nomeAutor = autor;
        comentario.tipoAutor = TipoConta.PESSOA;
        comentario.texto = texto;
        comentario.quando = quando;
        return comentario;
    }

    private void responder(Runnable resposta) {
        threadPrincipal.postDelayed(resposta, ATRASO_MILLIS);
    }
}
