package com.acesso.app.fragmentos;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;

import com.acesso.app.R;
import com.acesso.app.databinding.FragmentoEmConstrucaoBinding;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.RepositorioAutenticacao;
import com.acesso.app.telas.TelaPrincipal;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Conteúdo provisório das abas. Na aba Perfil também mostra o botão Sair,
 * que depois vai para a tela de Configurações.
 */
public class FragmentoEmConstrucao extends Fragment {

    private static final String ARG_TITULO = "titulo";
    private static final String ARG_MOSTRAR_SAIR = "mostrar_sair";

    public static FragmentoEmConstrucao novaInstancia(@StringRes int titulo, boolean mostrarSair) {
        Bundle argumentos = new Bundle();
        argumentos.putInt(ARG_TITULO, titulo);
        argumentos.putBoolean(ARG_MOSTRAR_SAIR, mostrarSair);
        FragmentoEmConstrucao fragmento = new FragmentoEmConstrucao();
        fragmento.setArguments(argumentos);
        return fragmento;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        FragmentoEmConstrucaoBinding componentes = FragmentoEmConstrucaoBinding.inflate(inflador, container, false);
        Bundle argumentos = requireArguments();
        componentes.textoTitulo.setText(argumentos.getInt(ARG_TITULO));

        if (argumentos.getBoolean(ARG_MOSTRAR_SAIR)) {
            GerenciadorSessao gerenciadorSessao = new GerenciadorSessao(requireContext());
            SessaoUsuario sessao = gerenciadorSessao.obter();
            if (sessao != null && sessao.getEmail() != null) {
                componentes.textoUsuarioLogado.setText(getString(R.string.usuario_logado_como, sessao.getEmail()));
                componentes.textoUsuarioLogado.setVisibility(View.VISIBLE);
            }
            componentes.botaoSair.setVisibility(View.VISIBLE);
            componentes.botaoSair.setOnClickListener(v -> confirmarSaida(gerenciadorSessao));
        }
        return componentes.getRoot();
    }

    private void confirmarSaida(GerenciadorSessao gerenciadorSessao) {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.sair_confirmar_titulo)
                .setMessage(R.string.sair_confirmar_mensagem)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.acao_sair, (dialogo, botao) -> {
                    SessaoUsuario sessao = gerenciadorSessao.obter();
                    if (sessao != null) {
                        new RepositorioAutenticacao(requireContext()).sair(sessao.getTokenAcesso());
                    }
                    gerenciadorSessao.limpar();
                    ((TelaPrincipal) requireActivity()).irParaLogin();
                })
                .show();
    }
}
