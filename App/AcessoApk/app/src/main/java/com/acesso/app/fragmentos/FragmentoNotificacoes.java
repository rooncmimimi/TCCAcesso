package com.acesso.app.fragmentos;

import android.graphics.Typeface;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.FragmentoNotificacoesBinding;
import com.acesso.app.databinding.ItemNotificacaoBinding;
import com.acesso.app.modelos.Notificacao;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.telas.TelaConversa;
import com.acesso.app.telas.TelaPerfilUsuario;
import com.acesso.app.telas.TelaVaga;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.ExibidorSecoes;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.ViewModelContadores;
import com.acesso.app.viewmodels.ViewModelNotificacoes;

import java.util.List;

/**
 * Aba Notificações: as mesmas do sino do site. Tocar marca como lida e abre o assunto quando o app tem a
 * tela correspondente (conversa, vaga ou perfil de quem agiu).
 */
public class FragmentoNotificacoes extends Fragment {

    private FragmentoNotificacoesBinding componentes;
    private ViewModelNotificacoes viewModel;
    private ViewModelContadores contadores;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup container,
                             @Nullable Bundle estadoSalvo) {
        componentes = FragmentoNotificacoesBinding.inflate(inflador, container, false);
        viewModel = new ViewModelProvider(requireActivity()).get(ViewModelNotificacoes.class);
        contadores = new ViewModelProvider(requireActivity()).get(ViewModelContadores.class);

        componentes.botaoMarcarTodas.setOnClickListener(v -> viewModel.marcarTodasComoLidas(contadores::atualizar));
        viewModel.getNotificacoes().observe(getViewLifecycleOwner(), estado -> {
            componentes.listaNotificacoes.removeAllViews();
            boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
            boolean temItens = ExibidorEstado.mostrar(componentes.estado, estado, vazio,
                    getString(R.string.notificacoes_vazio), viewModel::carregar);
            componentes.cartaoLista.setVisibility(temItens ? View.VISIBLE : View.GONE);
            componentes.botaoMarcarTodas.setVisibility(temItens && temNaoLida(estado.dados) ? View.VISIBLE : View.GONE);
            if (temItens) {
                for (Notificacao notificacao : estado.dados) {
                    componentes.listaNotificacoes.addView(criarItem(inflador, notificacao));
                }
            }
        });
        viewModel.getErroAcao().observe(getViewLifecycleOwner(), erro -> {
            if (erro != null) {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, erro);
                viewModel.limparErroAcao();
            }
        });
        viewModel.carregar();
        return componentes.getRoot();
    }

    /** A aba fica no FragmentManager: a cada volta a ela, busca as notificações novas. */
    @Override
    public void onHiddenChanged(boolean oculto) {
        super.onHiddenChanged(oculto);
        if (!oculto && viewModel != null) {
            MensagemStatus.esconder(componentes.mensagemStatus);
            viewModel.carregar();
        }
    }

    private static boolean temNaoLida(List<Notificacao> lista) {
        for (Notificacao notificacao : lista) {
            if (!notificacao.lida) {
                return true;
            }
        }
        return false;
    }

    private View criarItem(LayoutInflater inflador, Notificacao notificacao) {
        ItemNotificacaoBinding item = ItemNotificacaoBinding.inflate(inflador, componentes.listaNotificacoes, false);
        item.iconeTipo.setImageDrawable(ContextCompat.getDrawable(requireContext(), iconeDo(notificacao.tipo)));
        item.textoTitulo.setText(notificacao.titulo);
        ExibidorSecoes.mostrar(item.textoDescricao, notificacao.descricao);
        ExibidorSecoes.mostrar(item.textoQuando, notificacao.quando);
        // Não lida: fundo destacado e título em negrito, e o TalkBack diz "Não lida" (não depende só da cor).
        item.textoTitulo.setTypeface(null, notificacao.lida ? Typeface.NORMAL : Typeface.BOLD);
        if (!notificacao.lida) {
            item.conteudoItem.setBackgroundResource(R.drawable.fundo_item_nao_lido);
        }
        StringBuilder descricao = new StringBuilder();
        if (!notificacao.lida) {
            descricao.append(getString(R.string.notificacao_nao_lida)).append(". ");
        }
        descricao.append(notificacao.titulo);
        if (ExibidorSecoes.temTexto(notificacao.descricao)) {
            descricao.append(". ").append(notificacao.descricao);
        }
        if (ExibidorSecoes.temTexto(notificacao.quando)) {
            descricao.append(", ").append(notificacao.quando);
        }
        item.conteudoItem.setContentDescription(descricao);
        item.conteudoItem.setOnClickListener(v -> viewModel.marcarComoLida(notificacao, () -> {
            contadores.atualizar();
            abrirAssunto(notificacao);
        }));
        return item.getRoot();
    }

    /** Destino do toque pela entidade da notificação; sem tela correspondente no app, só marca como lida. */
    private void abrirAssunto(Notificacao notificacao) {
        if (!isAdded()) {
            return;
        }
        String entidade = notificacao.entidadeTipo;
        if ("conversa".equals(entidade)) {
            TelaConversa.abrir(requireContext(), notificacao.entidadeId);
        } else if ("vaga".equals(entidade)) {
            TelaVaga.abrir(requireContext(), notificacao.entidadeId);
        } else if ("usuario".equals(entidade) && !ehMinhaConta(notificacao.entidadeId)) {
            // Novo seguidor, solicitação aceita... Avisos sobre a própria conta (senha, e-mail) só marcam como lida.
            TelaPerfilUsuario.abrir(requireContext(), notificacao.entidadeId);
        }
    }

    private boolean ehMinhaConta(String usuarioId) {
        SessaoUsuario sessao = new GerenciadorSessao(requireContext()).obter();
        return usuarioId == null || (sessao != null && usuarioId.equalsIgnoreCase(sessao.getIdUsuario()));
    }

    private static int iconeDo(String tipo) {
        if (tipo == null) {
            return R.drawable.ic_notificacao;
        }
        switch (tipo) {
            case "mensagem":
                return R.drawable.ic_mensagem;
            case "vaga":
            case "candidatura":
                return R.drawable.ic_vaga;
            case "feed":
                return R.drawable.ic_favorito;
            case "moderacao":
                return R.drawable.ic_aviso;
            default:
                return R.drawable.ic_notificacao;
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        componentes = null;
    }
}
