package com.acesso.app.fragmentos;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.FragmentoPesquisaBinding;
import com.acesso.app.databinding.ItemResultadoBuscaBinding;
import com.acesso.app.modelos.ItemBusca;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.viewmodels.ViewModelPesquisa;

import java.util.List;

/** Aba Pesquisa: busca pessoas, empresas ou vagas (como a página /descobrir do site). */
public class FragmentoPesquisa extends Fragment {

    private FragmentoPesquisaBinding componentes;
    private ViewModelPesquisa viewModel;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        componentes = FragmentoPesquisaBinding.inflate(inflador, container, false);
        // Escopo da Activity: o resultado continua lá ao voltar para a aba.
        viewModel = new ViewModelProvider(requireActivity()).get(ViewModelPesquisa.class);

        componentes.botaoBuscar.setOnClickListener(v -> buscar());
        componentes.campoTermo.setEndIconOnClickListener(v -> buscar());
        componentes.entradaTermo.setOnEditorActionListener((v, acao, evento) -> {
            if (acao == EditorInfo.IME_ACTION_SEARCH) {
                buscar();
                return true;
            }
            return false;
        });
        // Trocar a categoria refaz a busca, se já houver um termo válido.
        componentes.grupoCategoria.setOnCheckedStateChangeListener((grupo, marcados) -> {
            if (viewModel.getResultados().getValue() != null) {
                buscar();
            }
        });

        viewModel.getErroTermo().observe(getViewLifecycleOwner(), componentes.campoTermo::setError);
        viewModel.getResultados().observe(getViewLifecycleOwner(), estado -> {
            componentes.listaResultados.removeAllViews();
            componentes.textoInstrucao.setVisibility(estado == null ? View.VISIBLE : View.GONE);
            boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
            if (ExibidorEstado.mostrar(componentes.estado, estado, vazio,
                    getString(R.string.pesquisa_nada_encontrado), this::buscar)) {
                mostrarResultados(inflador, estado.dados);
            }
        });
        return componentes.getRoot();
    }

    private void buscar() {
        esconderTeclado();
        viewModel.pesquisar(String.valueOf(componentes.entradaTermo.getText()), categoriaEscolhida());
    }

    private ItemBusca.Categoria categoriaEscolhida() {
        int id = componentes.grupoCategoria.getCheckedChipId();
        if (id == R.id.chipEmpresas) {
            return ItemBusca.Categoria.EMPRESAS;
        }
        if (id == R.id.chipVagas) {
            return ItemBusca.Categoria.VAGAS;
        }
        return ItemBusca.Categoria.PESSOAS;
    }

    private void mostrarResultados(LayoutInflater inflador, List<ItemBusca> itens) {
        for (ItemBusca item : itens) {
            ItemResultadoBuscaBinding linha = ItemResultadoBuscaBinding.inflate(inflador, componentes.listaResultados, false);
            linha.iconeCategoria.setImageDrawable(ContextCompat.getDrawable(requireContext(), iconeDa(item.categoria)));
            linha.textoTitulo.setText(item.titulo);
            boolean temSubtitulo = item.subtitulo != null && !item.subtitulo.isEmpty();
            linha.textoSubtitulo.setText(item.subtitulo);
            linha.textoSubtitulo.setVisibility(temSubtitulo ? View.VISIBLE : View.GONE);
            componentes.listaResultados.addView(linha.getRoot());
        }
    }

    private static int iconeDa(ItemBusca.Categoria categoria) {
        if (categoria == ItemBusca.Categoria.EMPRESAS) {
            return R.drawable.ic_empresa;
        }
        if (categoria == ItemBusca.Categoria.VAGAS) {
            return R.drawable.ic_vaga;
        }
        return R.drawable.ic_pessoas;
    }

    private void esconderTeclado() {
        InputMethodManager teclado = ContextCompat.getSystemService(requireContext(), InputMethodManager.class);
        if (teclado != null) {
            teclado.hideSoftInputFromWindow(componentes.entradaTermo.getWindowToken(), 0);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        componentes = null;
    }
}
