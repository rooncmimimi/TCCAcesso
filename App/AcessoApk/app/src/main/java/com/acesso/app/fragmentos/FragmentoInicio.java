package com.acesso.app.fragmentos;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.FragmentoInicioBinding;
import com.acesso.app.databinding.ItemPublicacaoBinding;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.telas.TelaPrincipal;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelInicio;

import java.util.List;

/** Aba Início: saudação, atalho para publicar e o feed da comunidade. */
public class FragmentoInicio extends Fragment {

    private FragmentoInicioBinding componentes;
    private ViewModelInicio viewModel;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        componentes = FragmentoInicioBinding.inflate(inflador, container, false);
        // Escopo da Activity: o feed carregado continua lá ao trocar de aba.
        viewModel = new ViewModelProvider(requireActivity()).get(ViewModelInicio.class);

        SessaoUsuario sessao = new GerenciadorSessao(requireContext()).obter();
        String primeiroNome = sessao != null ? Rotulos.primeiroNome(sessao.getNome()) : null;
        componentes.textoSaudacao.setText(primeiroNome != null
                ? getString(R.string.inicio_saudacao, primeiroNome)
                : getString(R.string.inicio_saudacao_sem_nome));
        componentes.textoSubtitulo.setText(sessao != null && sessao.ehEmpresa()
                ? R.string.inicio_subtitulo_empresa
                : R.string.inicio_subtitulo_pessoa);
        componentes.botaoEscrever.setOnClickListener(v ->
                ((TelaPrincipal) requireActivity()).abrirCriacao(false));

        viewModel.getPublicacoes().observe(getViewLifecycleOwner(), estado -> {
            componentes.listaPublicacoes.removeAllViews();
            boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
            if (ExibidorEstado.mostrar(componentes.estado, estado, vazio,
                    getString(R.string.inicio_sem_publicacoes), viewModel::carregar)) {
                mostrarPublicacoes(inflador, estado.dados);
            }
        });
        viewModel.carregarSeNecessario();
        return componentes.getRoot();
    }

    private void mostrarPublicacoes(LayoutInflater inflador, List<Publicacao> publicacoes) {
        for (Publicacao publicacao : publicacoes) {
            ItemPublicacaoBinding item = ItemPublicacaoBinding.inflate(inflador, componentes.listaPublicacoes, false);
            String tipo = getString(publicacao.tipoAutor == TipoConta.EMPRESA
                    ? R.string.tipo_conta_empresa : R.string.tipo_conta_pessoa);
            item.textoIniciais.setText(Rotulos.iniciais(publicacao.nomeAutor));
            item.textoAutor.setText(publicacao.nomeAutor);
            item.textoDetalhes.setText(tipo + " · " + publicacao.quando);
            item.textoConteudo.setText(publicacao.conteudo);
            item.textoInteracoes.setText(getString(R.string.publicacao_contagem,
                    publicacao.curtidas, publicacao.comentarios));
            componentes.listaPublicacoes.addView(item.getRoot());
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        componentes = null;
    }
}
