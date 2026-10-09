package com.acesso.app.fragmentos;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.FragmentoCriarBinding;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelCriar;
import com.google.android.material.chip.Chip;
import com.google.android.material.textfield.TextInputLayout;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Aba Criar: nova publicação (pessoa e empresa) e nova vaga (só empresa).
 * Valida com as regras do site antes de enviar; o envio passa pelo RepositorioConteudo.
 */
public class FragmentoCriar extends Fragment {

    private static final String ARG_VAGA = "vaga";

    private FragmentoCriarBinding componentes;
    private ViewModelCriar viewModel;
    private boolean ehEmpresa;

    /** Valores (da API) escolhidos nas listas suspensas, na ordem de Rotulos. */
    private String modalidade = "presencial";
    private String contrato = "clt";
    private String publicoAlvo = "geral";

    public static FragmentoCriar novaInstancia(boolean abrirVaga) {
        Bundle argumentos = new Bundle();
        argumentos.putBoolean(ARG_VAGA, abrirVaga);
        FragmentoCriar fragmento = new FragmentoCriar();
        fragmento.setArguments(argumentos);
        return fragmento;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        componentes = FragmentoCriarBinding.inflate(inflador, container, false);
        viewModel = new ViewModelProvider(this).get(ViewModelCriar.class);

        SessaoUsuario sessao = new GerenciadorSessao(requireContext()).obter();
        ehEmpresa = sessao != null && sessao.ehEmpresa();

        if (ehEmpresa) {
            componentes.grupoTipoCriacao.setVisibility(View.VISIBLE);
            componentes.grupoTipoCriacao.addOnButtonCheckedListener((grupo, id, marcado) -> {
                if (marcado) {
                    mostrarFormulario(id == R.id.botaoOpcaoVaga);
                }
            });
            prepararFormularioVaga();
            boolean abrirVaga = getArguments() != null && getArguments().getBoolean(ARG_VAGA);
            if (abrirVaga && estadoSalvo == null) {
                componentes.grupoTipoCriacao.check(R.id.botaoOpcaoVaga);
            }
        }
        mostrarFormulario(ehEmpresa && componentes.grupoTipoCriacao.getCheckedButtonId() == R.id.botaoOpcaoVaga);

        componentes.botaoEnviar.setOnClickListener(v -> enviar());
        observarViewModel();
        return componentes.getRoot();
    }

    private boolean formularioVagaAberto() {
        return ehEmpresa && componentes.grupoTipoCriacao.getCheckedButtonId() == R.id.botaoOpcaoVaga;
    }

    private void mostrarFormulario(boolean vaga) {
        componentes.secaoPublicacao.setVisibility(vaga ? View.GONE : View.VISIBLE);
        componentes.secaoVaga.setVisibility(vaga ? View.VISIBLE : View.GONE);
        componentes.botaoEnviar.setText(vaga ? R.string.acao_publicar_vaga : R.string.acao_publicar);
        viewModel.limpar();
        MensagemStatus.esconder(componentes.mensagemStatus);
    }

    private void prepararFormularioVaga() {
        prepararLista(componentes.entradaModalidade, Rotulos.MODALIDADES, modalidade, valor -> modalidade = valor);
        prepararLista(componentes.entradaContrato, Rotulos.CONTRATOS, contrato, valor -> contrato = valor);
        prepararLista(componentes.entradaPublicoAlvo, Rotulos.PUBLICOS, publicoAlvo, valor -> publicoAlvo = valor);

        for (String recurso : Rotulos.RECURSOS) {
            Chip chip = (Chip) getLayoutInflater().inflate(R.layout.item_chip_filtro, componentes.grupoRecursos, false);
            chip.setText(Rotulos.de(recurso));
            chip.setTag(recurso);
            componentes.grupoRecursos.addView(chip);
        }
    }

    private interface AoEscolher {
        void escolher(String valor);
    }

    /** Lista suspensa que mostra o rótulo em português e guarda o valor da API. */
    private void prepararLista(AutoCompleteTextView campo, String[] valores, String inicial, AoEscolher aoEscolher) {
        List<String> rotulos = new ArrayList<>();
        for (String valor : valores) {
            rotulos.add(getString(Rotulos.de(valor)));
        }
        campo.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_list_item_1, rotulos));
        campo.setText(getString(Rotulos.de(inicial)), false);
        campo.setOnItemClickListener((lista, item, posicao, id) -> aoEscolher.escolher(valores[posicao]));
    }

    private void enviar() {
        if (formularioVagaAberto()) {
            ViewModelCriar.FormularioVaga formulario = new ViewModelCriar.FormularioVaga();
            formulario.titulo = String.valueOf(componentes.entradaTituloVaga.getText());
            formulario.descricao = String.valueOf(componentes.entradaDescricaoVaga.getText());
            formulario.modalidade = modalidade;
            formulario.contrato = contrato;
            formulario.publicoAlvo = publicoAlvo;
            formulario.cidade = String.valueOf(componentes.entradaCidadeVaga.getText());
            formulario.estado = String.valueOf(componentes.entradaUfVaga.getText());
            List<String> recursos = new ArrayList<>();
            for (Integer id : componentes.grupoRecursos.getCheckedChipIds()) {
                recursos.add((String) componentes.grupoRecursos.findViewById(id).getTag());
            }
            formulario.recursosAcessibilidade = recursos;
            viewModel.criarVaga(formulario);
        } else {
            viewModel.publicar(String.valueOf(componentes.entradaPublicacao.getText()));
        }
    }

    private void observarViewModel() {
        viewModel.getErros().observe(getViewLifecycleOwner(), erros -> {
            mostrarErro(componentes.campoPublicacao, erros, ViewModelCriar.CAMPO_CONTEUDO);
            mostrarErro(componentes.campoTituloVaga, erros, ViewModelCriar.CAMPO_TITULO);
            mostrarErro(componentes.campoDescricaoVaga, erros, ViewModelCriar.CAMPO_DESCRICAO);
            mostrarErro(componentes.campoCidadeVaga, erros, ViewModelCriar.CAMPO_CIDADE);
            mostrarErro(componentes.campoUfVaga, erros, ViewModelCriar.CAMPO_ESTADO);
            // Leva o foco (e o TalkBack) ao primeiro campo com problema.
            if (erros.containsKey(ViewModelCriar.CAMPO_CONTEUDO)) componentes.entradaPublicacao.requestFocus();
            else if (erros.containsKey(ViewModelCriar.CAMPO_TITULO)) componentes.entradaTituloVaga.requestFocus();
            else if (erros.containsKey(ViewModelCriar.CAMPO_DESCRICAO)) componentes.entradaDescricaoVaga.requestFocus();
            else if (erros.containsKey(ViewModelCriar.CAMPO_CIDADE)) componentes.entradaCidadeVaga.requestFocus();
            else if (erros.containsKey(ViewModelCriar.CAMPO_ESTADO)) componentes.entradaUfVaga.requestFocus();
        });

        viewModel.getEnvio().observe(getViewLifecycleOwner(), estado -> {
            boolean vaga = formularioVagaAberto();
            boolean enviando = estado != null && estado.carregando;
            componentes.botaoEnviar.setEnabled(!enviando);
            componentes.botaoEnviar.setText(enviando ? R.string.acao_publicando
                    : vaga ? R.string.acao_publicar_vaga : R.string.acao_publicar);
            if (estado == null) {
                return;
            }
            if (enviando) {
                MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.acao_publicando));
            } else if (estado.mensagem != null) {
                if (estado.integracaoPendente()) {
                    MensagemStatus.mostrarAviso(componentes.mensagemStatus, estado.mensagem);
                } else {
                    MensagemStatus.mostrarErro(componentes.mensagemStatus, estado.mensagem);
                }
            } else {
                boolean demonstracao = FabricaRepositorios.modoDemonstracao();
                MensagemStatus.mostrarSucesso(componentes.mensagemStatus, getString(vaga
                        ? (demonstracao ? R.string.criar_vaga_sucesso_demo : R.string.criar_vaga_sucesso)
                        : (demonstracao ? R.string.criar_publicacao_sucesso_demo : R.string.criar_publicacao_sucesso)));
                limparCampos();
            }
        });
    }

    private void limparCampos() {
        componentes.entradaPublicacao.setText(null);
        componentes.entradaTituloVaga.setText(null);
        componentes.entradaDescricaoVaga.setText(null);
        componentes.entradaCidadeVaga.setText(null);
        componentes.entradaUfVaga.setText(null);
        componentes.grupoRecursos.clearCheck();
    }

    private static void mostrarErro(TextInputLayout campo, Map<String, String> erros, String chave) {
        campo.setError(erros.get(chave));
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        componentes = null;
    }
}
