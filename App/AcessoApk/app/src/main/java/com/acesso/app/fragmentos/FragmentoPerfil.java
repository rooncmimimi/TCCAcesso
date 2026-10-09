package com.acesso.app.fragmentos;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.FragmentoPerfilBinding;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.telas.TelaTermos;
import com.acesso.app.utilitarios.AtalhosSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelSessao;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Aba Perfil: quem está logado, atalhos da conta e do app, e o botão Sair.
 * Junta o perfil e as configurações do site numa lista, que é o padrão no celular.
 */
public class FragmentoPerfil extends Fragment {

    private FragmentoPerfilBinding componentes;
    private ViewModelSessao viewModelSessao;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        componentes = FragmentoPerfilBinding.inflate(inflador, container, false);
        // Mesmo ViewModel da TelaPrincipal: ao sair, é ela quem leva à apresentação.
        viewModelSessao = new ViewModelProvider(requireActivity()).get(ViewModelSessao.class);
        viewModelSessao.getSessao().observe(getViewLifecycleOwner(), this::mostrarConta);

        componentes.botaoEditarPerfil.setOnClickListener(v ->
                MensagemStatus.mostrarAviso(componentes.mensagemStatus, getString(R.string.perfil_editar_pendente)));
        componentes.botaoSair.setOnClickListener(v -> confirmarSaida());
        componentes.botaoAcessibilidade.setOnClickListener(v ->
                AtalhosSistema.abrirConfiguracoesAcessibilidade(requireContext()));
        componentes.botaoTermos.setOnClickListener(v ->
                startActivity(new Intent(requireContext(), TelaTermos.class)));
        componentes.botaoFaleConosco.setOnClickListener(v -> {
            if (!AtalhosSistema.escreverParaEquipe(requireContext())) {
                MensagemStatus.mostrarAviso(componentes.mensagemStatus, getString(R.string.sem_app_email));
            }
        });
        return componentes.getRoot();
    }

    private void mostrarConta(SessaoUsuario sessao) {
        if (sessao == null) {
            return;
        }
        String nome = sessao.getNome() != null && !sessao.getNome().trim().isEmpty()
                ? sessao.getNome().trim()
                : sessao.getEmail();
        componentes.textoIniciais.setText(Rotulos.iniciais(nome));
        componentes.textoNome.setText(nome);
        componentes.textoEmail.setText(sessao.getEmail());
        componentes.textoTipoConta.setText(sessao.ehEmpresa() ? R.string.tipo_conta_empresa : R.string.tipo_conta_pessoa);

        int status = Rotulos.de(sessao.getStatusEmpresa());
        if (sessao.ehEmpresa() && status != 0) {
            componentes.textoStatusEmpresa.setText(getString(R.string.perfil_status_empresa, getString(status)));
            componentes.textoStatusEmpresa.setVisibility(View.VISIBLE);
        } else {
            componentes.textoStatusEmpresa.setVisibility(View.GONE);
        }
        // O TalkBack lê o cartão inteiro de uma vez: "Nome, e-mail, tipo de conta".
        componentes.cabecalhoPerfil.setContentDescription(nome + ", " + sessao.getEmail() + ", "
                + componentes.textoTipoConta.getText()
                + (componentes.textoStatusEmpresa.getVisibility() == View.VISIBLE
                ? ", " + componentes.textoStatusEmpresa.getText() : ""));
    }

    private void confirmarSaida() {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.sair_confirmar_titulo)
                .setMessage(R.string.sair_confirmar_mensagem)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.acao_sair, (dialogo, botao) -> viewModelSessao.sair())
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        componentes = null;
    }
}
