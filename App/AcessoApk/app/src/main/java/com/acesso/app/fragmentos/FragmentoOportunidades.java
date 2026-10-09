package com.acesso.app.fragmentos;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ComponenteMetricaBinding;
import com.acesso.app.databinding.FragmentoOportunidadesBinding;
import com.acesso.app.databinding.ItemVagaBinding;
import com.acesso.app.modelos.ResumoEmpresa;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.Vaga;
import com.acesso.app.telas.TelaPrincipal;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelOportunidades;
import com.google.android.material.chip.Chip;

import java.util.ArrayList;
import java.util.List;

/**
 * Aba Oportunidades. Pessoa vê a busca de vagas; empresa vê o painel com
 * números e as próprias vagas (como /vagas e /dashboard/empresa no site).
 */
public class FragmentoOportunidades extends Fragment {

    private FragmentoOportunidadesBinding componentes;
    private ViewModelOportunidades viewModel;
    private LayoutInflater inflador;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        this.inflador = inflador;
        componentes = FragmentoOportunidadesBinding.inflate(inflador, container, false);
        viewModel = new ViewModelProvider(requireActivity()).get(ViewModelOportunidades.class);

        SessaoUsuario sessao = new GerenciadorSessao(requireContext()).obter();
        if (sessao != null && sessao.ehEmpresa()) {
            prepararPainelEmpresa();
        } else {
            prepararBuscaVagas();
        }
        return componentes.getRoot();
    }

    // ---------------------------------------------------------------------
    // Pessoa: vagas

    private void prepararBuscaVagas() {
        componentes.secaoPessoa.setVisibility(View.VISIBLE);
        componentes.secaoEmpresa.setVisibility(View.GONE);

        marcarFiltrosAtuais();
        componentes.campoBusca.setEndIconOnClickListener(v -> buscar());
        componentes.entradaBusca.setOnEditorActionListener((v, acao, evento) -> {
            if (acao == EditorInfo.IME_ACTION_SEARCH) {
                buscar();
                return true;
            }
            return false;
        });
        // Filtros aplicam na hora, como escolher uma opção no site e tocar em Buscar.
        componentes.grupoModalidade.setOnCheckedStateChangeListener((grupo, marcados) -> buscar());
        componentes.grupoPublico.setOnCheckedStateChangeListener((grupo, marcados) -> buscar());

        viewModel.getVagas().observe(getViewLifecycleOwner(), estado -> {
            componentes.listaVagas.removeAllViews();
            componentes.textoContagem.setVisibility(View.GONE);
            boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
            if (estado != null && estado.dados != null) {
                componentes.textoContagem.setText(getResources().getQuantityString(
                        R.plurals.vagas_contagem, estado.dados.size(), estado.dados.size()));
                componentes.textoContagem.setVisibility(View.VISIBLE);
            }
            if (ExibidorEstado.mostrar(componentes.estadoVagas, estado, vazio,
                    getString(R.string.vagas_nenhuma), this::buscar)) {
                for (Vaga vaga : estado.dados) {
                    componentes.listaVagas.addView(criarItemVaga(vaga, false));
                }
            }
        });
        viewModel.carregarVagasSeNecessario();
    }

    private void buscar() {
        esconderTeclado();
        viewModel.buscarVagas(String.valueOf(componentes.entradaBusca.getText()),
                modalidadeEscolhida(), publicoEscolhido());
    }

    private String modalidadeEscolhida() {
        int marcado = componentes.grupoModalidade.getCheckedChipId();
        if (marcado == R.id.chipPresencial) return "presencial";
        if (marcado == R.id.chipHibrido) return "hibrido";
        if (marcado == R.id.chipRemoto) return "remoto";
        return null;
    }

    private String publicoEscolhido() {
        int marcado = componentes.grupoPublico.getCheckedChipId();
        if (marcado == R.id.chipPcd) return "pcd";
        if (marcado == R.id.chipCinquentaMais) return "cinquenta_mais";
        if (marcado == R.id.chipPcdCinquentaMais) return "pcd_cinquenta_mais";
        return null;
    }

    /** Ao voltar para a aba, os chips mostram os filtros já aplicados. */
    private void marcarFiltrosAtuais() {
        String modalidade = viewModel.getModalidade();
        if ("presencial".equals(modalidade)) componentes.grupoModalidade.check(R.id.chipPresencial);
        else if ("hibrido".equals(modalidade)) componentes.grupoModalidade.check(R.id.chipHibrido);
        else if ("remoto".equals(modalidade)) componentes.grupoModalidade.check(R.id.chipRemoto);

        String publico = viewModel.getPublicoAlvo();
        if ("pcd".equals(publico)) componentes.grupoPublico.check(R.id.chipPcd);
        else if ("cinquenta_mais".equals(publico)) componentes.grupoPublico.check(R.id.chipCinquentaMais);
        else if ("pcd_cinquenta_mais".equals(publico)) componentes.grupoPublico.check(R.id.chipPcdCinquentaMais);
    }

    // ---------------------------------------------------------------------
    // Empresa: painel

    private void prepararPainelEmpresa() {
        componentes.secaoPessoa.setVisibility(View.GONE);
        componentes.secaoEmpresa.setVisibility(View.VISIBLE);
        componentes.botaoPublicarVaga.setOnClickListener(v ->
                ((TelaPrincipal) requireActivity()).abrirCriacao(true));

        viewModel.getResumoEmpresa().observe(getViewLifecycleOwner(), estado -> {
            componentes.listaVagasEmpresa.removeAllViews();
            ResumoEmpresa resumo = estado != null ? estado.dados : null;
            mostrarMetrica(componentes.metricaVagasPublicadas, R.string.painel_vagas_publicadas,
                    resumo != null ? resumo.vagasPublicadas : null);
            mostrarMetrica(componentes.metricaVagasAbertas, R.string.painel_vagas_abertas,
                    resumo != null ? resumo.vagasAbertas : null);
            mostrarMetrica(componentes.metricaCandidaturas, R.string.painel_candidaturas,
                    resumo != null ? resumo.candidaturas : null);
            mostrarMetrica(componentes.metricaSeguidores, R.string.painel_seguidores,
                    resumo != null ? resumo.seguidores : null);

            boolean vazio = resumo != null && resumo.vagas.isEmpty();
            if (ExibidorEstado.mostrar(componentes.estadoEmpresa, estado, vazio,
                    getString(R.string.painel_sem_vagas), () -> viewModel.carregarResumoEmpresa(true))) {
                for (Vaga vaga : resumo.vagas) {
                    componentes.listaVagasEmpresa.addView(criarItemVaga(vaga, true));
                }
            }
        });
        viewModel.carregarResumoEmpresa(false);
    }

    /** Sem dados (carregando ou integração pendente), mostra um traço em vez de um número inventado. */
    private void mostrarMetrica(ComponenteMetricaBinding metrica, int rotulo, Integer valor) {
        String textoValor = valor != null ? String.valueOf(valor) : "—";
        metrica.textoValor.setText(textoValor);
        metrica.textoRotulo.setText(rotulo);
        metrica.conteudoMetrica.setContentDescription(getString(rotulo) + ": "
                + (valor != null ? textoValor : getString(R.string.carregando)));
    }

    // ---------------------------------------------------------------------

    private View criarItemVaga(Vaga vaga, boolean mostrarCandidaturas) {
        ItemVagaBinding item = ItemVagaBinding.inflate(inflador, componentes.listaVagas, false);
        item.textoTitulo.setText(vaga.titulo);
        item.textoEmpresa.setText(vaga.nomeEmpresa);
        if (vaga.empresaVerificada) {
            item.textoEmpresa.setCompoundDrawablesRelativeWithIntrinsicBounds(0, 0, R.drawable.ic_verificado, 0);
            item.textoEmpresa.setContentDescription(vaga.nomeEmpresa + ", " + getString(R.string.vaga_empresa_verificada));
        }

        List<String> local = new ArrayList<>();
        if (Rotulos.de(vaga.modalidade) != 0) local.add(getString(Rotulos.de(vaga.modalidade)));
        if (vaga.cidade != null) local.add(vaga.estado != null ? vaga.cidade + " - " + vaga.estado : vaga.cidade);
        item.textoLocal.setText(local.isEmpty() ? getString(R.string.vaga_local_nao_informado) : String.join(" · ", local));
        item.textoDescricao.setText(vaga.descricao);

        if (vaga.publicoAlvo != null && !"geral".equals(vaga.publicoAlvo)) {
            adicionarSelo(item, getString(Rotulos.de(vaga.publicoAlvo)), true);
        }
        if (Rotulos.de(vaga.contrato) != 0) {
            adicionarSelo(item, getString(Rotulos.de(vaga.contrato)), false);
        }
        // Como no site: até 3 recursos no cartão, sem o genérico "outro".
        int recursos = 0;
        for (String recurso : vaga.recursosAcessibilidade) {
            if (!"outro".equals(recurso) && Rotulos.de(recurso) != 0 && recursos < 3) {
                adicionarSelo(item, getString(Rotulos.de(recurso)), false);
                recursos++;
            }
        }
        if (mostrarCandidaturas) {
            item.textoCandidaturas.setText(getString(R.string.vaga_candidaturas, vaga.totalCandidaturas));
            item.textoCandidaturas.setVisibility(View.VISIBLE);
        }
        return item.getRoot();
    }

    /** Selo informativo (não clicável) dentro do cartão da vaga. */
    private void adicionarSelo(ItemVagaBinding item, String texto, boolean destaque) {
        Chip selo = new Chip(requireContext());
        selo.setText(texto);
        selo.setClickable(false);
        selo.setFocusable(false);
        selo.setEnsureMinTouchTargetSize(false);
        selo.setChipBackgroundColorResource(destaque ? R.color.acesso_container_primaria : R.color.acesso_fundo_secundario);
        selo.setTextColor(requireContext().getColor(destaque ? R.color.acesso_sobre_container_primaria : R.color.acesso_texto));
        selo.setChipStrokeWidth(0);
        item.grupoSelos.addView(selo);
    }

    private void esconderTeclado() {
        InputMethodManager teclado = requireContext().getSystemService(InputMethodManager.class);
        if (teclado != null) {
            teclado.hideSoftInputFromWindow(componentes.entradaBusca.getWindowToken(), 0);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        componentes = null;
    }
}
