package com.acesso.app.viewmodels;

import android.app.Application;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RepositorioSocial;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.PreparadorImagem;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Editar perfil: carrega o perfil atual, salva os dados (PUT /usuarios, /candidatos ou /empresas) e envia foto,
 * logo ou capa (PATCH multipart). O resultado de cada operação fica em um LiveData, para sobreviver a girar a tela.
 */
public class ViewModelEditarPerfil extends AndroidViewModel {

    /** Maior lado da foto/logo e da capa enviadas. */
    public static final int LADO_FOTO = 1024;
    public static final int LADO_CAPA = 1920;

    /** Andamento e resultado de uma operação (salvar ou enviar imagem). */
    public static class Operacao {
        public enum Fase { ANDAMENTO, CONCLUIDA, FALHOU }

        public final Fase fase;
        /** Só nas imagens: qual delas. Nulo ao salvar os dados. */
        public final RepositorioSocial.Imagem imagem;
        public final String mensagem;

        Operacao(Fase fase, RepositorioSocial.Imagem imagem, String mensagem) {
            this.fase = fase;
            this.imagem = imagem;
            this.mensagem = mensagem;
        }
    }

    private final RepositorioConteudo conteudo;
    private final RepositorioSocial social;
    private final GerenciadorSessao gerenciadorSessao;
    private final ExecutorService fundo = Executors.newSingleThreadExecutor();
    private final Handler principal = new Handler(Looper.getMainLooper());
    private final MutableLiveData<EstadoConteudo<PerfilConta>> perfil = new MutableLiveData<>();
    private final MutableLiveData<Operacao> salvamento = new MutableLiveData<>();
    private final MutableLiveData<Operacao> envio = new MutableLiveData<>();

    public ViewModelEditarPerfil(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
        conteudo = FabricaRepositorios.conteudo(aplicacao);
        social = FabricaRepositorios.social(aplicacao);
    }

    public LiveData<EstadoConteudo<PerfilConta>> getPerfil() {
        return perfil;
    }

    public LiveData<Operacao> getSalvamento() {
        return salvamento;
    }

    public LiveData<Operacao> getEnvio() {
        return envio;
    }

    public void carregarSeNecessario() {
        if (perfil.getValue() == null || perfil.getValue().dados == null) {
            carregar();
        }
    }

    public void carregar() {
        SessaoUsuario sessao = gerenciadorSessao.obter();
        perfil.setValue(EstadoConteudo.carregando());
        conteudo.carregarPerfil(sessao, new RetornoRepositorio<PerfilConta>() {
            @Override
            public void aoConcluir(PerfilConta resultado) {
                if (sessao != null) {
                    resultado.tipoConta = sessao.getTipoConta();
                    if (resultado.usuarioId == null) {
                        resultado.usuarioId = sessao.getIdUsuario();
                    }
                }
                perfil.setValue(EstadoConteudo.pronto(resultado));
            }

            @Override
            public void aoFalhar(String mensagem) {
                perfil.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        });
    }

    public void salvar(EdicaoPerfil edicao) {
        Operacao atual = salvamento.getValue();
        if (atual != null && atual.fase == Operacao.Fase.ANDAMENTO) {
            return;
        }
        salvamento.setValue(new Operacao(Operacao.Fase.ANDAMENTO, null, null));
        social.atualizarPerfil(gerenciadorSessao.obter(), edicao, new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                salvamento.setValue(new Operacao(Operacao.Fase.CONCLUIDA, null, null));
            }

            @Override
            public void aoFalhar(String mensagem) {
                salvamento.setValue(new Operacao(Operacao.Fase.FALHOU, null, mensagem));
            }
        });
    }

    /**
     * Reduz a imagem escolhida (fora da thread principal) e a envia.
     *
     * @param destinoId id da conta (foto e capa da pessoa) ou da empresa (logo e capa da empresa).
     */
    public void enviarImagem(RepositorioSocial.Imagem imagem, Uri origem, String destinoId) {
        Operacao atual = envio.getValue();
        if (atual != null && atual.fase == Operacao.Fase.ANDAMENTO) {
            return;
        }
        envio.setValue(new Operacao(Operacao.Fase.ANDAMENTO, imagem, null));
        int lado = imagem == RepositorioSocial.Imagem.FOTO_PERFIL || imagem == RepositorioSocial.Imagem.LOGO_EMPRESA
                ? LADO_FOTO : LADO_CAPA;
        fundo.execute(() -> {
            byte[] jpeg;
            try {
                jpeg = PreparadorImagem.prepararJpeg(getApplication().getContentResolver(), origem, lado);
            } catch (IOException | RuntimeException falha) {
                String mensagem = falha instanceof PreparadorImagem.ImagemInvalida
                        ? falha.getMessage() : "Não foi possível ler a imagem escolhida.";
                principal.post(() -> envio.setValue(new Operacao(Operacao.Fase.FALHOU, imagem, mensagem)));
                return;
            }
            principal.post(() -> social.enviarImagem(gerenciadorSessao.obter(), imagem, destinoId, jpeg,
                    new RetornoRepositorio<String>() {
                        @Override
                        public void aoConcluir(String url) {
                            guardarUrl(imagem, url);
                            envio.setValue(new Operacao(Operacao.Fase.CONCLUIDA, imagem, null));
                        }

                        @Override
                        public void aoFalhar(String mensagem) {
                            envio.setValue(new Operacao(Operacao.Fase.FALHOU, imagem, mensagem));
                        }
                    }));
        });
    }

    /** A API confirmou o envio: o perfil em memória passa a apontar para a imagem nova. */
    private void guardarUrl(RepositorioSocial.Imagem imagem, String url) {
        EstadoConteudo<PerfilConta> estado = perfil.getValue();
        if (estado == null || estado.dados == null) {
            return;
        }
        PerfilConta dados = estado.dados;
        if (imagem == RepositorioSocial.Imagem.FOTO_PERFIL || imagem == RepositorioSocial.Imagem.LOGO_EMPRESA) {
            dados.fotoUrl = url;
        } else {
            dados.capaUrl = url;
        }
        perfil.setValue(EstadoConteudo.pronto(dados));
    }

    @Override
    protected void onCleared() {
        fundo.shutdown();
    }
}
