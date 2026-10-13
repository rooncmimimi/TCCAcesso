package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Validador;

import java.time.LocalDate;

public class ViewModelCadastro extends AndroidViewModel {

    /** Resultado final do cadastro, para a tela decidir para onde ir. */
    public enum Desfecho { NENHUM, LOGADO, CONFIRMAR_EMAIL }

    /** Os dados digitados, agrupados para não passar sete parâmetros soltos. */
    public static class Formulario {
        public String nome;
        public String email;
        public String senha;
        public String confirmacaoSenha;
        public String cidade;
        public String dataNascimento;
        public boolean aceitouTermos;
    }

    /** Uma mensagem por campo; null quando o campo está correto. */
    public static class ErrosFormulario {
        public String nome;
        public String email;
        public String senha;
        public String confirmacaoSenha;
        public String cidade;
        public String dataNascimento;
        public String termos;

        boolean temAlgum() {
            return nome != null || email != null || senha != null || confirmacaoSenha != null
                    || cidade != null || dataNascimento != null || termos != null;
        }
    }

    private final RepositorioAutenticacao repositorioAutenticacao;
    private final GerenciadorSessao gerenciadorSessao;

    private final MutableLiveData<ErrosFormulario> errosFormulario = new MutableLiveData<>(new ErrosFormulario());
    private final MutableLiveData<String> mensagemErro = new MutableLiveData<>();
    private final MutableLiveData<Boolean> carregando = new MutableLiveData<>(false);
    private final MutableLiveData<Desfecho> desfecho = new MutableLiveData<>(Desfecho.NENHUM);

    public ViewModelCadastro(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = new RepositorioAutenticacao(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
    }

    public LiveData<ErrosFormulario> getErrosFormulario() {
        return errosFormulario;
    }

    public LiveData<String> getMensagemErro() {
        return mensagemErro;
    }

    public LiveData<Boolean> estaCarregando() {
        return carregando;
    }

    public LiveData<Desfecho> getDesfecho() {
        return desfecho;
    }

    public void cadastrar(Formulario formulario) {
        if (Boolean.TRUE.equals(carregando.getValue())) {
            return;
        }
        mensagemErro.setValue(null);

        ErrosFormulario erros = validar(formulario);
        errosFormulario.setValue(erros);
        if (erros.temAlgum()) {
            return;
        }

        LocalDate dataNascimento = Validador.converterDataBrasileira(formulario.dataNascimento);
        String dataNascimentoIso = dataNascimento != null ? dataNascimento.toString() : null;

        carregando.setValue(true);
        repositorioAutenticacao.cadastrar(formulario.nome, formulario.email, formulario.senha,
                formulario.cidade, dataNascimentoIso, new RetornoRepositorio<ResultadoCadastro>() {
                    @Override
                    public void aoConcluir(ResultadoCadastro resultado) {
                        carregando.setValue(false);
                        if (resultado.precisaConfirmarEmail()) {
                            desfecho.setValue(Desfecho.CONFIRMAR_EMAIL);
                        } else {
                            gerenciadorSessao.salvar(resultado.getSessao());
                            desfecho.setValue(Desfecho.LOGADO);
                        }
                    }

                    @Override
                    public void aoFalhar(String mensagem) {
                        carregando.setValue(false);
                        mensagemErro.setValue(mensagem);
                    }
                });
    }

    static ErrosFormulario validar(Formulario formulario) {
        ErrosFormulario erros = new ErrosFormulario();
        erros.nome = Validador.validarNome(formulario.nome);
        erros.email = Validador.validarEmail(formulario.email);
        erros.senha = Validador.validarNovaSenha(formulario.senha);
        erros.confirmacaoSenha =
                Validador.validarConfirmacaoSenha(formulario.senha, formulario.confirmacaoSenha);
        erros.cidade = Validador.validarCidade(formulario.cidade);
        erros.dataNascimento = Validador.validarDataNascimento(formulario.dataNascimento, LocalDate.now());
        erros.termos = Validador.validarAceiteTermos(formulario.aceitouTermos);
        return erros;
    }
}
