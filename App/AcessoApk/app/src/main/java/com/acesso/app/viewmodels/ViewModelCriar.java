package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.Vaga;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioConteudo;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Validador;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Aba Criar: nova publicação (pessoa e empresa) e nova vaga (só empresa),
 * com as regras de postagemValidator.js e vagaValidator.js do Site.
 */
public class ViewModelCriar extends AndroidViewModel {

    public static final String CAMPO_CONTEUDO = "conteudo";
    public static final String CAMPO_TITULO = "titulo";
    public static final String CAMPO_DESCRICAO = "descricao";
    public static final String CAMPO_CIDADE = "cidade";
    public static final String CAMPO_ESTADO = "estado";

    /** O que foi digitado no formulário de vaga. */
    public static class FormularioVaga {
        public String titulo;
        public String descricao;
        public String modalidade;
        public String contrato;
        public String publicoAlvo;
        public String cidade;
        public String estado;
        public List<String> recursosAcessibilidade;
    }

    private final RepositorioConteudo repositorio = FabricaRepositorios.conteudo();
    private final GerenciadorSessao gerenciadorSessao;

    private final MutableLiveData<Map<String, String>> erros = new MutableLiveData<>(Collections.emptyMap());
    /** pronto(true) = enviado; mensagem = aviso de integração pendente ou erro. */
    private final MutableLiveData<EstadoConteudo<Boolean>> envio = new MutableLiveData<>();

    public ViewModelCriar(@NonNull Application aplicacao) {
        super(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
    }

    public LiveData<Map<String, String>> getErros() {
        return erros;
    }

    public LiveData<EstadoConteudo<Boolean>> getEnvio() {
        return envio;
    }

    public void limpar() {
        erros.setValue(Collections.emptyMap());
        envio.setValue(null);
    }

    public void publicar(String conteudo) {
        if (estaEnviando()) {
            return;
        }
        Map<String, String> problemas = new LinkedHashMap<>();
        String problema = Validador.validarPublicacao(conteudo);
        if (problema != null) {
            problemas.put(CAMPO_CONTEUDO, problema);
        }
        erros.setValue(problemas);
        if (!problemas.isEmpty()) {
            return;
        }
        envio.setValue(EstadoConteudo.carregando());
        repositorio.publicar(gerenciadorSessao.obter(), conteudo.trim(), retornoEnvio());
    }

    public void criarVaga(FormularioVaga formulario) {
        if (estaEnviando()) {
            return;
        }
        Map<String, String> problemas = validarVaga(formulario);
        erros.setValue(problemas);
        if (!problemas.isEmpty()) {
            return;
        }
        envio.setValue(EstadoConteudo.carregando());
        repositorio.criarVaga(gerenciadorSessao.obter(), montarVaga(formulario), retornoEnvio());
    }

    static Map<String, String> validarVaga(FormularioVaga formulario) {
        Map<String, String> problemas = new LinkedHashMap<>();
        anotar(problemas, CAMPO_TITULO, Validador.validarTituloVaga(formulario.titulo));
        anotar(problemas, CAMPO_DESCRICAO, Validador.validarDescricaoVaga(formulario.descricao));
        anotar(problemas, CAMPO_CIDADE, Validador.validarTamanhoMaximo(formulario.cidade, 100));
        anotar(problemas, CAMPO_ESTADO, Validador.validarUf(formulario.estado));
        return problemas;
    }

    static Vaga montarVaga(FormularioVaga formulario) {
        Vaga vaga = new Vaga();
        vaga.titulo = formulario.titulo.trim();
        vaga.descricao = formulario.descricao.trim();
        vaga.modalidade = formulario.modalidade;
        vaga.contrato = formulario.contrato;
        vaga.publicoAlvo = formulario.publicoAlvo;
        vaga.cidade = Validador.estaVazio(formulario.cidade) ? null : formulario.cidade.trim();
        vaga.estado = Validador.estaVazio(formulario.estado) ? null : formulario.estado.trim().toUpperCase(Locale.ROOT);
        vaga.status = "aberta";
        if (formulario.recursosAcessibilidade != null) {
            vaga.recursosAcessibilidade = formulario.recursosAcessibilidade;
        }
        return vaga;
    }

    private boolean estaEnviando() {
        EstadoConteudo<Boolean> atual = envio.getValue();
        return atual != null && atual.carregando;
    }

    private RetornoRepositorio<Void> retornoEnvio() {
        return new RetornoRepositorio<Void>() {
            @Override
            public void aoConcluir(Void resultado) {
                envio.setValue(EstadoConteudo.pronto(true));
            }

            @Override
            public void aoFalhar(String mensagem) {
                envio.setValue(EstadoConteudo.comMensagem(mensagem));
            }
        };
    }

    private static void anotar(Map<String, String> problemas, String campo, String mensagem) {
        if (mensagem != null) {
            problemas.put(campo, mensagem);
        }
    }
}
