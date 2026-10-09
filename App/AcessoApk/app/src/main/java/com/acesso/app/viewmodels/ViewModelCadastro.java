package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.modelos.DadosCadastroEmpresa;
import com.acesso.app.modelos.DadosCadastroPessoa;
import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.repositorios.RetornoRepositorio;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Validador;

import java.time.LocalDate;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Cadastro de pessoa candidata e de empresa, com os campos do Site.
 *
 * Os erros ficam num mapa "campo -> mensagem", com os mesmos nomes de campo da API
 * (Campos.*). Assim, um erro que o servidor apontar num campo (ex.: CNPJ já cadastrado)
 * aparece ao lado do campo, igual aos erros que o próprio app encontra.
 */
public class ViewModelCadastro extends AndroidViewModel {

    /** Nomes dos campos (iguais aos da API do Site, mais os que só o app usa). */
    public static final class Campos {
        public static final String NOME = "nome";
        public static final String EMAIL = "email";
        public static final String SENHA = "senha";
        public static final String CONFIRMACAO_SENHA = "confirmacaoSenha";
        public static final String TELEFONE = "telefone";
        public static final String CPF = "cpf";
        public static final String CIDADE = "cidade";
        public static final String DATA_NASCIMENTO = "dataNascimento";
        public static final String TERMOS = "termos";
        public static final String CNPJ = "cnpj";
        public static final String RAZAO_SOCIAL = "razaoSocial";
        public static final String NOME_FANTASIA = "nomeFantasia";
        public static final String SETOR = "setor";
        public static final String SITE = "site";
        public static final String DESCRICAO = "descricao";
        public static final String ESTADO = "estado";
        public static final String ENDERECO = "endereco";
        public static final String CEP = "cep";

        private Campos() {
        }
    }

    /** Resultado final do cadastro, para a tela decidir para onde ir. */
    public enum Desfecho { NENHUM, AUTENTICADO, CONFIRMAR_EMAIL }

    /** O que foi digitado no cadastro de pessoa, sem tratamento. */
    public static class FormularioPessoa {
        public String nome;
        public String email;
        public String senha;
        public String confirmacaoSenha;
        public String telefone;
        public String cpf;
        public String cidade;
        public String dataNascimento;
        public boolean aceitouTermos;
    }

    /** O que foi digitado no cadastro de empresa, sem tratamento. */
    public static class FormularioEmpresa {
        public String nome;
        public String razaoSocial;
        public String nomeFantasia;
        public String cnpj;
        public String email;
        public String telefone;
        public String cidade;
        public String estado;
        public String endereco;
        public String cep;
        public String setor;
        /** mei, micro, pequena, media, grande ou null. */
        public String porte;
        public String site;
        public String descricao;
        public String senha;
        public String confirmacaoSenha;
        public boolean aceitouTermos;
    }

    private final RepositorioAutenticacao repositorioAutenticacao;
    private final GerenciadorSessao gerenciadorSessao;

    private final MutableLiveData<Map<String, String>> errosFormulario = new MutableLiveData<>(Collections.emptyMap());
    private final MutableLiveData<String> mensagemErro = new MutableLiveData<>();
    private final MutableLiveData<Boolean> carregando = new MutableLiveData<>(false);
    private final MutableLiveData<Desfecho> desfecho = new MutableLiveData<>(Desfecho.NENHUM);
    private SessaoUsuario sessaoCriada;

    public ViewModelCadastro(@NonNull Application aplicacao) {
        super(aplicacao);
        repositorioAutenticacao = FabricaRepositorios.autenticacao(aplicacao);
        gerenciadorSessao = new GerenciadorSessao(aplicacao);
    }

    public LiveData<Map<String, String>> getErrosFormulario() {
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

    /** Só existe quando o desfecho é AUTENTICADO. */
    public SessaoUsuario getSessaoCriada() {
        return sessaoCriada;
    }

    /** Ao trocar entre pessoa e empresa, os erros do outro formulário saem da tela. */
    public void limparErros() {
        errosFormulario.setValue(Collections.emptyMap());
        mensagemErro.setValue(null);
    }

    public void cadastrarPessoa(FormularioPessoa formulario) {
        if (!prepararEnvio(validarPessoa(formulario, LocalDate.now()))) {
            return;
        }
        repositorioAutenticacao.cadastrarPessoa(montarDadosPessoa(formulario), retornoCadastro());
    }

    public void cadastrarEmpresa(FormularioEmpresa formulario) {
        if (!prepararEnvio(validarEmpresa(formulario))) {
            return;
        }
        repositorioAutenticacao.cadastrarEmpresa(montarDadosEmpresa(formulario), retornoCadastro());
    }

    /** Impede envio repetido e envio de formulário inválido. */
    private boolean prepararEnvio(Map<String, String> erros) {
        if (Boolean.TRUE.equals(carregando.getValue())) {
            return false;
        }
        mensagemErro.setValue(null);
        errosFormulario.setValue(erros);
        if (!erros.isEmpty()) {
            mensagemErro.setValue("Confira os campos destacados.");
            return false;
        }
        carregando.setValue(true);
        return true;
    }

    private RetornoRepositorio<ResultadoCadastro> retornoCadastro() {
        return new RetornoRepositorio<ResultadoCadastro>() {
            @Override
            public void aoConcluir(ResultadoCadastro resultado) {
                carregando.setValue(false);
                if (resultado.precisaConfirmarEmail()) {
                    desfecho.setValue(Desfecho.CONFIRMAR_EMAIL);
                } else {
                    sessaoCriada = resultado.getSessao();
                    gerenciadorSessao.salvar(sessaoCriada);
                    desfecho.setValue(Desfecho.AUTENTICADO);
                }
            }

            @Override
            public void aoFalhar(String mensagem) {
                carregando.setValue(false);
                mensagemErro.setValue(mensagem);
            }

            @Override
            public void aoFalharComCampos(String mensagem, Map<String, String> errosCampos) {
                carregando.setValue(false);
                errosFormulario.setValue(new LinkedHashMap<>(errosCampos));
                mensagemErro.setValue(mensagem);
            }
        };
    }

    // ---------------------------------------------------------------------
    // Validação e montagem dos dados (sem Android, testadas em ViewModelCadastroTeste)

    static Map<String, String> validarPessoa(FormularioPessoa formulario, LocalDate hoje) {
        Map<String, String> erros = new LinkedHashMap<>();
        anotar(erros, Campos.NOME, Validador.validarNome(formulario.nome));
        anotar(erros, Campos.EMAIL, Validador.validarEmail(formulario.email));
        anotar(erros, Campos.TELEFONE, Validador.validarTelefone(formulario.telefone));
        anotar(erros, Campos.CPF, Validador.validarCpf(formulario.cpf));
        anotar(erros, Campos.SENHA, Validador.validarNovaSenha(formulario.senha));
        anotar(erros, Campos.CONFIRMACAO_SENHA,
                Validador.validarConfirmacaoSenha(formulario.senha, formulario.confirmacaoSenha));
        anotar(erros, Campos.CIDADE, Validador.validarCidade(formulario.cidade));
        anotar(erros, Campos.DATA_NASCIMENTO, Validador.validarDataNascimento(formulario.dataNascimento, hoje));
        anotar(erros, Campos.TERMOS, Validador.validarAceiteTermos(formulario.aceitouTermos));
        return erros;
    }

    static Map<String, String> validarEmpresa(FormularioEmpresa formulario) {
        Map<String, String> erros = new LinkedHashMap<>();
        anotar(erros, Campos.NOME, Validador.validarNome(formulario.nome));
        anotar(erros, Campos.RAZAO_SOCIAL, Validador.validarRazaoSocial(formulario.razaoSocial));
        anotar(erros, Campos.NOME_FANTASIA, Validador.validarTamanhoMaximo(formulario.nomeFantasia, 200));
        anotar(erros, Campos.CNPJ, Validador.validarCnpj(formulario.cnpj));
        anotar(erros, Campos.EMAIL, Validador.validarEmail(formulario.email));
        anotar(erros, Campos.TELEFONE, Validador.validarTelefone(formulario.telefone));
        anotar(erros, Campos.CIDADE, Validador.validarTamanhoMaximo(formulario.cidade, 100));
        anotar(erros, Campos.ESTADO, Validador.validarUf(formulario.estado));
        anotar(erros, Campos.ENDERECO, Validador.validarTamanhoMaximo(formulario.endereco, 255));
        anotar(erros, Campos.CEP, Validador.validarCep(formulario.cep));
        anotar(erros, Campos.SETOR, Validador.validarTamanhoMaximo(formulario.setor, 120));
        anotar(erros, Campos.SITE, Validador.validarSite(formulario.site));
        anotar(erros, Campos.DESCRICAO, Validador.validarTamanhoMaximo(formulario.descricao, 4000));
        anotar(erros, Campos.SENHA, Validador.validarNovaSenha(formulario.senha));
        anotar(erros, Campos.CONFIRMACAO_SENHA,
                Validador.validarConfirmacaoSenha(formulario.senha, formulario.confirmacaoSenha));
        anotar(erros, Campos.TERMOS, Validador.validarAceiteTermos(formulario.aceitouTermos));
        return erros;
    }

    static DadosCadastroPessoa montarDadosPessoa(FormularioPessoa formulario) {
        DadosCadastroPessoa dados = new DadosCadastroPessoa();
        dados.nome = formulario.nome.trim();
        dados.email = formulario.email.trim().toLowerCase(Locale.ROOT);
        dados.senha = formulario.senha;
        dados.telefone = digitosOuNulo(formulario.telefone);
        dados.cpf = digitosOuNulo(formulario.cpf);
        dados.cidade = formulario.cidade.trim();
        LocalDate dataNascimento = Validador.converterDataBrasileira(formulario.dataNascimento);
        dados.dataNascimentoIso = dataNascimento != null ? dataNascimento.toString() : null;
        dados.aceitouTermos = formulario.aceitouTermos;
        return dados;
    }

    static DadosCadastroEmpresa montarDadosEmpresa(FormularioEmpresa formulario) {
        DadosCadastroEmpresa dados = new DadosCadastroEmpresa();
        dados.nome = formulario.nome.trim();
        dados.email = formulario.email.trim().toLowerCase(Locale.ROOT);
        dados.senha = formulario.senha;
        dados.telefone = digitosOuNulo(formulario.telefone);
        dados.cnpj = Validador.somenteDigitos(formulario.cnpj);
        dados.razaoSocial = formulario.razaoSocial.trim();
        dados.nomeFantasia = textoOuNulo(formulario.nomeFantasia);
        dados.setor = textoOuNulo(formulario.setor);
        dados.porte = textoOuNulo(formulario.porte);
        dados.site = textoOuNulo(formulario.site);
        dados.descricao = textoOuNulo(formulario.descricao);
        dados.cidade = textoOuNulo(formulario.cidade);
        String estado = textoOuNulo(formulario.estado);
        dados.estado = estado != null ? estado.toUpperCase(Locale.ROOT) : null;
        dados.endereco = textoOuNulo(formulario.endereco);
        dados.cep = digitosOuNulo(formulario.cep);
        dados.aceitouTermos = formulario.aceitouTermos;
        return dados;
    }

    private static void anotar(Map<String, String> erros, String campo, String mensagem) {
        if (mensagem != null) {
            erros.put(campo, mensagem);
        }
    }

    private static String textoOuNulo(String valor) {
        return Validador.estaVazio(valor) ? null : valor.trim();
    }

    private static String digitosOuNulo(String valor) {
        String digitos = Validador.somenteDigitos(valor);
        return digitos.isEmpty() ? null : digitos;
    }
}
