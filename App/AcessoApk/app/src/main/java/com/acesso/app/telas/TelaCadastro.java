package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaCadastroBinding;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.Mascaras;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.ModoCadastroEmpresa;
import com.acesso.app.utilitarios.Navegacao;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelCadastro;
import com.acesso.app.viewmodels.ViewModelCadastro.Campos;
import com.google.android.material.datepicker.CalendarConstraints;
import com.google.android.material.datepicker.DateValidatorPointBackward;
import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.textfield.TextInputLayout;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cadastro de pessoa candidata ou de empresa (seletor "Eu sou" no topo), com os campos
 * do site. Aberto por cima do login: Voltar e "Já tem conta? Entrar" levam ao login.
 *
 * Na API do Site a conta de empresa nasce de uma conta de candidato (ver {@link ModoCadastroEmpresa}):
 * <ul>
 *   <li>sem conta logada, "Empresa" mostra uma explicação e leva ao cadastro de pessoa, que depois
 *       continua no da empresa;</li>
 *   <li>logado como pessoa (aberto pelo Perfil), só existe o formulário da empresa;</li>
 *   <li>criada a empresa com e-mail por confirmar, o formulário dá lugar a um painel com os próximos passos.</li>
 * </ul>
 */
public class TelaCadastro extends AppCompatActivity {

    /** true para abrir já com "Empresa" escolhido (botão "Sou empresa" da apresentação). */
    public static final String EXTRA_EMPRESA = "empresa";

    private static final String ESTADO_PORTE = "porte";
    private static final DateTimeFormatter DATA_BRASILEIRA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Abre já no cadastro de empresa; quem está logado como pessoa cadastra a empresa dela. */
    public static Intent intencaoParaEmpresa(Context contexto) {
        return new Intent(contexto, TelaCadastro.class).putExtra(EXTRA_EMPRESA, true);
    }

    private TelaCadastroBinding componentes;
    private ViewModelCadastro viewModel;
    /** Confirmação do e-mail da empresa; sem confirmar (voltou), o painel segue com "Confirmar agora" e "Depois". */
    private final ActivityResultLauncher<Intent> confirmacaoEmail = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), resultado -> {
                if (resultado.getResultCode() == RESULT_OK) {
                    viewModel.marcarEmailConfirmado();
                }
            });
    /** Valor da API escolhido na lista de porte (mei, micro...), ou null. */
    private String porte;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        componentes = TelaCadastroBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.raiz);

        componentes.avisoDemonstracao.getRoot().setVisibility(
                FabricaRepositorios.modoDemonstracao() ? View.VISIBLE : View.GONE);

        viewModel = new ViewModelProvider(this).get(ViewModelCadastro.class);
        observarViewModel();

        Mascaras.aplicarTelefone(componentes.entradaTelefone);
        Mascaras.aplicar(componentes.entradaCpf, Mascaras.CPF);
        Mascaras.aplicar(componentes.entradaCnpj, Mascaras.CNPJ);
        Mascaras.aplicar(componentes.entradaCep, Mascaras.CEP);
        prepararListaPorte(estadoSalvo != null ? estadoSalvo.getString(ESTADO_PORTE) : null);

        componentes.grupoTipoConta.addOnButtonCheckedListener((grupo, id, marcado) -> {
            if (marcado) {
                viewModel.limparErros();
                mostrarSecoes(id == R.id.botaoTipoEmpresa);
            }
        });
        boolean logadoComoPessoa = viewModel.getModoEmpresa() == ModoCadastroEmpresa.COM_CONTA_DE_PESSOA;
        if (logadoComoPessoa || (estadoSalvo == null && getIntent().getBooleanExtra(EXTRA_EMPRESA, false))) {
            componentes.grupoTipoConta.check(R.id.botaoTipoEmpresa);
        }
        mostrarSecoes(ehEmpresa());

        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
        componentes.campoDataNascimento.setEndIconOnClickListener(v -> abrirCalendario());
        componentes.botaoLerTermos.setOnClickListener(v ->
                startActivity(new Intent(this, TelaTermos.class)));
        componentes.botaoIrParaLogin.setOnClickListener(v -> finish());
        componentes.botaoCadastrar.setOnClickListener(v -> enviar());

        componentes.botaoCriarContaPessoa.setOnClickListener(v -> {
            viewModel.definirContinuarComEmpresa(true);
            componentes.grupoTipoConta.check(R.id.botaoTipoPessoa);
            componentes.rolagem.smoothScrollTo(0, 0);
        });
        componentes.botaoJaTenhoContaPessoa.setOnClickListener(v -> finish());
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle estado) {
        super.onSaveInstanceState(estado);
        estado.putString(ESTADO_PORTE, porte);
    }

    private boolean ehEmpresa() {
        return componentes.grupoTipoConta.getCheckedButtonId() == R.id.botaoTipoEmpresa;
    }

    /** Mostra só os campos do tipo de conta escolhido; os campos comuns ficam sempre. */
    private void mostrarSecoes(boolean empresa) {
        componentes.secaoPessoa.setVisibility(empresa ? View.GONE : View.VISIBLE);
        componentes.secaoEmpresa.setVisibility(empresa ? View.VISIBLE : View.GONE);
        componentes.campoNomeCompleto.setHint(empresa ? R.string.rotulo_nome_responsavel : R.string.rotulo_nome_completo);
        // O telefone é obrigatório para pessoa (a API exige) e continua opcional para empresa.
        componentes.campoTelefone.setHint(empresa ? R.string.rotulo_telefone_opcional : R.string.rotulo_telefone);
        atualizarEstadoDaTela();
    }

    /**
     * Decide o que aparece: o formulário, a explicação "primeiro, a sua conta pessoal" ou o painel do
     * e-mail da empresa. Tudo sai do estado (tipo escolhido, conta logada, desfecho), então volta igual
     * depois de girar a tela.
     */
    private void atualizarEstadoDaTela() {
        boolean empresa = ehEmpresa();
        ModoCadastroEmpresa modo = viewModel.getModoEmpresa();
        boolean logadoComoPessoa = modo == ModoCadastroEmpresa.COM_CONTA_DE_PESSOA;
        boolean painelDeEmail = viewModel.getDesfecho().getValue() == ViewModelCadastro.Desfecho.CONFIRMAR_EMAIL;
        boolean portao = empresa && modo == ModoCadastroEmpresa.PRECISA_CONTA_DE_PESSOA && !painelDeEmail;
        boolean formulario = !portao && !painelDeEmail;

        // Logado como pessoa só existe um caminho (cadastrar a empresa); com o painel aberto, a escolha já foi feita.
        int seletor = logadoComoPessoa || painelDeEmail ? View.GONE : View.VISIBLE;
        componentes.rotuloTipoConta.setVisibility(seletor);
        componentes.grupoTipoConta.setVisibility(seletor);

        componentes.cartaoPortaoEmpresa.setVisibility(portao ? View.VISIBLE : View.GONE);
        componentes.cartaoEmailEmpresa.setVisibility(painelDeEmail ? View.VISIBLE : View.GONE);
        componentes.blocoFormulario.setVisibility(formulario ? View.VISIBLE : View.GONE);
        componentes.avisoAprovacaoEmpresa.setVisibility(empresa && formulario ? View.VISIBLE : View.GONE);
        componentes.textoContinuaEmpresa.setVisibility(
                !empresa && viewModel.deveContinuarComEmpresa() ? View.VISIBLE : View.GONE);
        componentes.botaoIrParaLogin.setVisibility(logadoComoPessoa ? View.GONE : View.VISIBLE);

        SessaoUsuario sessao = viewModel.getSessaoAtual();
        if (logadoComoPessoa && formulario && sessao != null) {
            componentes.textoContaVinculada.setText(getString(R.string.cadastro_empresa_vinculada, sessao.getEmail()));
            componentes.textoContaVinculada.setVisibility(View.VISIBLE);
        } else {
            componentes.textoContaVinculada.setVisibility(View.GONE);
        }
        if (painelDeEmail) {
            atualizarPainelDeEmail(logadoComoPessoa);
        }
    }

    /**
     * Painel da empresa criada. Com confirmação por código: "falta confirmar" (Confirmar agora / Depois) e,
     * confirmado, o caminho para entrar com a conta da empresa. Sem código (Supabase, por link): só o aviso.
     */
    private void atualizarPainelDeEmail(boolean logadoComoPessoa) {
        boolean porCodigo = viewModel.confirmaEmailPorCodigo() && viewModel.getEmailPendente() != null;
        boolean confirmado = Boolean.TRUE.equals(viewModel.getEmailConfirmado().getValue());

        if (!porCodigo) {
            componentes.tituloEmailEmpresa.setText(R.string.cadastro_confirmar_email_titulo);
            componentes.mensagemEmailEmpresa.setText(R.string.cadastro_confirmar_email_mensagem);
            configurarBotoesDoPainel(R.string.acao_ir_para_login, v -> finish(), 0, null);
        } else if (!confirmado) {
            componentes.tituloEmailEmpresa.setText(R.string.cadastro_email_pendente_titulo);
            componentes.mensagemEmailEmpresa.setText(
                    getString(R.string.cadastro_email_pendente_mensagem, viewModel.getEmailPendente()));
            configurarBotoesDoPainel(R.string.acao_confirmar_agora, v -> abrirConfirmacao(false),
                    R.string.acao_depois, v -> finish());
        } else if (logadoComoPessoa) {
            componentes.tituloEmailEmpresa.setText(R.string.cadastro_email_confirmado_titulo);
            componentes.mensagemEmailEmpresa.setText(R.string.cadastro_email_confirmado_mensagem_pessoa);
            configurarBotoesDoPainel(R.string.acao_entrar_com_empresa, v -> entrarComAEmpresa(),
                    R.string.acao_agora_nao, v -> finish());
        } else {
            componentes.tituloEmailEmpresa.setText(R.string.cadastro_email_confirmado_titulo);
            componentes.mensagemEmailEmpresa.setText(R.string.cadastro_email_confirmado_mensagem);
            configurarBotoesDoPainel(R.string.acao_ir_para_login, v -> finish(), 0, null);
        }
    }

    private void configurarBotoesDoPainel(int textoPrincipal, View.OnClickListener aoPrincipal,
                                          int textoSecundario, View.OnClickListener aoSecundario) {
        componentes.botaoPrincipalEmailEmpresa.setText(textoPrincipal);
        componentes.botaoPrincipalEmailEmpresa.setOnClickListener(aoPrincipal);
        boolean temSecundario = aoSecundario != null;
        componentes.botaoSecundarioEmailEmpresa.setVisibility(temSecundario ? View.VISIBLE : View.GONE);
        if (temSecundario) {
            componentes.botaoSecundarioEmailEmpresa.setText(textoSecundario);
            componentes.botaoSecundarioEmailEmpresa.setOnClickListener(aoSecundario);
        }
    }

    private void abrirConfirmacao(boolean codigoRecemEnviado) {
        confirmacaoEmail.launch(TelaConfirmarEmail.intencao(this, viewModel.getEmailPendente(), codigoRecemEnviado));
    }

    /** A empresa tem login próprio: encerra a conta de pessoa e abre o login com o e-mail da empresa. */
    private void entrarComAEmpresa() {
        String emailDaEmpresa = viewModel.getEmailPendente();
        viewModel.sairDaContaAtual();
        Navegacao.abrirLoginDoZero(this, emailDaEmpresa);
    }

    private void prepararListaPorte(String porteSalvo) {
        String[] rotulos = new String[Rotulos.PORTES.length];
        for (int i = 0; i < rotulos.length; i++) {
            rotulos[i] = getString(Rotulos.de(Rotulos.PORTES[i]));
        }
        componentes.entradaPorte.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, rotulos));
        componentes.entradaPorte.setOnItemClickListener((lista, item, posicao, id) -> porte = Rotulos.PORTES[posicao]);
        porte = porteSalvo;
        if (porte != null) {
            // false: sem filtrar a lista, senão ela passaria a mostrar só a opção escolhida.
            componentes.entradaPorte.setText(getString(Rotulos.de(porte)), false);
        }
    }

    private void enviar() {
        if (ehEmpresa()) {
            ViewModelCadastro.FormularioEmpresa formulario = new ViewModelCadastro.FormularioEmpresa();
            formulario.nome = texto(componentes.entradaNomeCompleto.getText());
            formulario.email = texto(componentes.entradaEmail.getText());
            formulario.telefone = texto(componentes.entradaTelefone.getText());
            formulario.razaoSocial = texto(componentes.entradaRazaoSocial.getText());
            formulario.nomeFantasia = texto(componentes.entradaNomeFantasia.getText());
            formulario.cnpj = texto(componentes.entradaCnpj.getText());
            formulario.cidade = texto(componentes.entradaCidadeEmpresa.getText());
            formulario.estado = texto(componentes.entradaUf.getText());
            formulario.endereco = texto(componentes.entradaEndereco.getText());
            formulario.cep = texto(componentes.entradaCep.getText());
            formulario.setor = texto(componentes.entradaSetor.getText());
            formulario.porte = porte;
            formulario.site = texto(componentes.entradaSite.getText());
            formulario.descricao = texto(componentes.entradaDescricao.getText());
            formulario.senha = texto(componentes.entradaSenha.getText());
            formulario.confirmacaoSenha = texto(componentes.entradaConfirmacaoSenha.getText());
            formulario.aceitouTermos = componentes.caixaTermos.isChecked();
            viewModel.cadastrarEmpresa(formulario);
        } else {
            ViewModelCadastro.FormularioPessoa formulario = new ViewModelCadastro.FormularioPessoa();
            formulario.nome = texto(componentes.entradaNomeCompleto.getText());
            formulario.email = texto(componentes.entradaEmail.getText());
            formulario.telefone = texto(componentes.entradaTelefone.getText());
            formulario.cpf = texto(componentes.entradaCpf.getText());
            formulario.cidade = texto(componentes.entradaCidade.getText());
            formulario.estado = texto(componentes.entradaUfPessoa.getText());
            formulario.dataNascimento = texto(componentes.entradaDataNascimento.getText());
            formulario.senha = texto(componentes.entradaSenha.getText());
            formulario.confirmacaoSenha = texto(componentes.entradaConfirmacaoSenha.getText());
            formulario.aceitouTermos = componentes.caixaTermos.isChecked();
            viewModel.cadastrarPessoa(formulario);
        }
    }

    private static String texto(CharSequence valor) {
        return valor != null ? valor.toString() : "";
    }

    /** Calendário como alternativa a digitar a data. Só permite datas no passado. */
    private void abrirCalendario() {
        CalendarConstraints restricoes = new CalendarConstraints.Builder()
                .setValidator(DateValidatorPointBackward.now())
                .build();
        MaterialDatePicker<Long> calendario = MaterialDatePicker.Builder.datePicker()
                .setTitleText(R.string.titulo_calendario_nascimento)
                .setInputMode(MaterialDatePicker.INPUT_MODE_TEXT)
                .setCalendarConstraints(restricoes)
                .build();
        calendario.addOnPositiveButtonClickListener(dataEscolhida -> {
            String data = Instant.ofEpochMilli(dataEscolhida).atZone(ZoneOffset.UTC).toLocalDate().format(DATA_BRASILEIRA);
            componentes.entradaDataNascimento.setText(data);
        });
        calendario.show(getSupportFragmentManager(), "calendario_nascimento");
    }

    /** Campos do formulário atual, na ordem em que aparecem na tela (chave = nome do campo na API). */
    private Map<String, TextInputLayout> camposNaOrdem() {
        Map<String, TextInputLayout> campos = new LinkedHashMap<>();
        campos.put(Campos.NOME, componentes.campoNomeCompleto);
        campos.put(Campos.EMAIL, componentes.campoEmail);
        campos.put(Campos.TELEFONE, componentes.campoTelefone);
        if (ehEmpresa()) {
            campos.put(Campos.RAZAO_SOCIAL, componentes.campoRazaoSocial);
            campos.put(Campos.NOME_FANTASIA, componentes.campoNomeFantasia);
            campos.put(Campos.CNPJ, componentes.campoCnpj);
            campos.put(Campos.CIDADE, componentes.campoCidadeEmpresa);
            campos.put(Campos.ESTADO, componentes.campoUf);
            campos.put(Campos.ENDERECO, componentes.campoEndereco);
            campos.put(Campos.CEP, componentes.campoCep);
            campos.put(Campos.SETOR, componentes.campoSetor);
            campos.put(Campos.SITE, componentes.campoSite);
            campos.put(Campos.DESCRICAO, componentes.campoDescricao);
        } else {
            campos.put(Campos.CPF, componentes.campoCpf);
            campos.put(Campos.CIDADE, componentes.campoCidade);
            campos.put(Campos.ESTADO, componentes.campoUfPessoa);
            campos.put(Campos.DATA_NASCIMENTO, componentes.campoDataNascimento);
        }
        campos.put(Campos.SENHA, componentes.campoSenha);
        campos.put(Campos.CONFIRMACAO_SENHA, componentes.campoConfirmacaoSenha);
        return campos;
    }

    private void mostrarErros(Map<String, String> erros) {
        View primeiroComErro = null;
        for (Map.Entry<String, TextInputLayout> campo : camposNaOrdem().entrySet()) {
            String erro = erros.get(campo.getKey());
            campo.getValue().setError(erro);
            if (erro != null && primeiroComErro == null) {
                primeiroComErro = campo.getValue().getEditText();
            }
        }
        String erroTermos = erros.get(Campos.TERMOS);
        componentes.erroTermos.setText(erroTermos);
        componentes.erroTermos.setVisibility(erroTermos != null ? View.VISIBLE : View.GONE);
        if (erroTermos != null && primeiroComErro == null) {
            primeiroComErro = componentes.caixaTermos;
        }
        // Leva o foco (e o TalkBack) ao primeiro campo com problema, rolando até ele.
        if (primeiroComErro != null) {
            primeiroComErro.requestFocus();
        }
    }

    private void observarViewModel() {
        viewModel.getErrosFormulario().observe(this, this::mostrarErros);

        viewModel.estaCarregando().observe(this, carregando -> {
            componentes.botaoCadastrar.setEnabled(!carregando);
            componentes.grupoTipoConta.setEnabled(!carregando);
            componentes.botaoCadastrar.setText(carregando ? R.string.acao_cadastrando : R.string.acao_cadastrar);
            if (carregando) {
                MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.acao_cadastrando));
            } else if (viewModel.getMensagemErro().getValue() == null) {
                MensagemStatus.esconder(componentes.mensagemStatus);
            }
        });

        viewModel.getMensagemErro().observe(this, mensagem -> {
            if (mensagem != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, mensagem);
            } else if (!Boolean.TRUE.equals(viewModel.estaCarregando().getValue())) {
                MensagemStatus.esconder(componentes.mensagemStatus);
            }
        });

        viewModel.getDesfecho().observe(this, desfecho -> {
            if (desfecho == ViewModelCadastro.Desfecho.AUTENTICADO) {
                SessaoUsuario sessao = viewModel.getSessaoCriada();
                if (viewModel.deveContinuarComEmpresa() && !sessao.ehEmpresa()) {
                    Navegacao.abrirAreaEContinuarComEmpresa(this);
                } else {
                    Navegacao.abrirAreaAutenticada(this, sessao);
                }
            } else if (desfecho == ViewModelCadastro.Desfecho.CONFIRMAR_EMAIL) {
                atualizarEstadoDaTela();
                // O botão que enviou o formulário ficava no fim da página: o painel precisa aparecer pelo topo.
                componentes.rolagem.post(() -> componentes.rolagem.scrollTo(0, 0));
                // Na primeira vez abre a confirmação por conta própria; depois, só pelos botões do painel.
                if (viewModel.confirmaEmailPorCodigo() && viewModel.getEmailPendente() != null
                        && viewModel.tomarOfertaDeConfirmacao()) {
                    abrirConfirmacao(true);
                }
            }
        });

        viewModel.getEmailConfirmado().observe(this, confirmado -> atualizarEstadoDaTela());
    }
}
