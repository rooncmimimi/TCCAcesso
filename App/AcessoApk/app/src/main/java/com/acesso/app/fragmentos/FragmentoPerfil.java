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
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.telas.TelaCandidaturas;
import com.acesso.app.telas.TelaConversas;
import com.acesso.app.telas.TelaEditarPerfil;
import com.acesso.app.telas.TelaTermos;
import com.acesso.app.telas.TelaVaga;
import com.acesso.app.utilitarios.AtalhosSistema;
import com.acesso.app.utilitarios.ExibidorPerfil;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.EstadoConteudo;
import com.acesso.app.viewmodels.ViewModelPerfil;
import com.acesso.app.viewmodels.ViewModelSessao;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Aba Perfil: o perfil profissional da conta (cabeçalho e seções, como o perfil do site) e, abaixo,
 * atalhos da conta e do app e o botão Sair. Enquanto o servidor não responde, mostra o que está na sessão.
 */
public class FragmentoPerfil extends Fragment {

    private FragmentoPerfilBinding componentes;
    private ViewModelSessao viewModelSessao;
    private ViewModelPerfil viewModelPerfil;
    /** Dados da conta vindos do servidor; enquanto não chegam (ou se falhar), vale o que está na sessão. */
    private PerfilConta perfilServidor;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        componentes = FragmentoPerfilBinding.inflate(inflador, container, false);
        // Mesmo ViewModel da TelaPrincipal: ao sair, é ela quem leva à apresentação.
        viewModelSessao = new ViewModelProvider(requireActivity()).get(ViewModelSessao.class);
        viewModelSessao.getSessao().observe(getViewLifecycleOwner(), this::mostrarConta);
        viewModelPerfil = new ViewModelProvider(requireActivity()).get(ViewModelPerfil.class);
        viewModelPerfil.getPerfil().observe(getViewLifecycleOwner(), this::aoMudarPerfil);
        viewModelPerfil.carregar();

        SessaoUsuario sessao = viewModelSessao.getSessao().getValue();
        // Candidaturas são da pessoa candidata; a empresa acompanha as recebidas no Painel.
        componentes.botaoCandidaturas.setVisibility(sessao != null && sessao.ehEmpresa() ? View.GONE : View.VISIBLE);
        componentes.botaoCandidaturas.setOnClickListener(v -> TelaCandidaturas.abrir(requireContext()));
        componentes.botaoMensagens.setOnClickListener(v -> TelaConversas.abrir(requireContext()));
        componentes.botaoEditarPerfil.setOnClickListener(v -> TelaEditarPerfil.abrir(requireContext()));
        viewModelPerfil.getResumo().observe(getViewLifecycleOwner(), resumo -> {
            ExibidorPerfil.seguidores(componentes.cabecalho, resumo, sessao != null && sessao.ehEmpresa());
        });
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

    /** Volta da edição do perfil (ou de outra tela): mostra o que foi alterado. */
    @Override
    public void onResume() {
        super.onResume();
        if (!isHidden() && viewModelPerfil != null) {
            viewModelPerfil.carregar();
        }
    }

    /** A aba fica no FragmentManager: a cada volta a ela, busca de novo os dados da conta. */
    @Override
    public void onHiddenChanged(boolean oculto) {
        super.onHiddenChanged(oculto);
        if (!oculto && viewModelPerfil != null) {
            viewModelPerfil.carregar();
        }
    }

    private void aoMudarPerfil(EstadoConteudo<PerfilConta> estado) {
        if (estado == null) {
            perfilServidor = null;
        } else if (estado.dados != null) {
            perfilServidor = estado.dados;
            mostrarConta(viewModelSessao.getSessao().getValue());
        } else if (estado.mensagem != null && !estado.integracaoPendente()) {
            MensagemStatus.mostrarErro(componentes.mensagemStatus, estado.mensagem);
        }
    }

    private void mostrarConta(SessaoUsuario sessao) {
        if (sessao == null) {
            return;
        }
        String nomeBase = perfilServidor != null && perfilServidor.nome != null && !perfilServidor.nome.trim().isEmpty()
                ? perfilServidor.nome
                : sessao.getNome();
        String nome = nomeBase != null && !nomeBase.trim().isEmpty() ? nomeBase.trim() : sessao.getEmail();
        String statusEmpresa = perfilServidor != null && perfilServidor.statusEmpresa != null
                ? perfilServidor.statusEmpresa
                : sessao.getStatusEmpresa();
        ExibidorPerfil.cabecalho(componentes.cabecalho, nome,
                perfilServidor != null ? perfilServidor.detalhe : null,
                sessao.getEmail(), sessao.getTipoConta(), statusEmpresa);
        ExibidorPerfil.imagens(componentes.cabecalho, perfilServidor != null ? perfilServidor.fotoUrl : null,
                perfilServidor != null ? perfilServidor.capaUrl : null);
        ExibidorPerfil.seguidores(componentes.cabecalho, viewModelPerfil.getResumo().getValue(), sessao.ehEmpresa());
        if (perfilServidor != null) {
            perfilServidor.tipoConta = sessao.getTipoConta();
            ExibidorPerfil.secoes(componentes.secoes, perfilServidor, true, getLayoutInflater(),
                    vaga -> TelaVaga.abrir(requireContext(), vaga.id));
        }
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
