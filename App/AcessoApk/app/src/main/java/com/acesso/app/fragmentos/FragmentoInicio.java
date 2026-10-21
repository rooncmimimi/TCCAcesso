package com.acesso.app.fragmentos;

import android.content.res.ColorStateList;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.PopupMenu;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.DialogoEditarPublicacaoBinding;
import com.acesso.app.databinding.FragmentoInicioBinding;
import com.acesso.app.databinding.ItemPublicacaoBinding;
import com.acesso.app.modelos.Publicacao;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.telas.TelaComentarios;
import com.acesso.app.telas.TelaPerfilUsuario;
import com.acesso.app.telas.TelaPrincipal;
import com.acesso.app.utilitarios.CarregadorImagem;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.ExibidorImagem;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelInicio;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.List;

/**
 * Aba Início: saudação, atalho para publicar e o feed da comunidade. Nas publicações da própria conta há o menu
 * para editar e excluir; em todas, curtir, comentar (abre a tela de comentários) e as imagens anexadas.
 */
public class FragmentoInicio extends Fragment {

    private static final int LIMITE_PUBLICACAO = 3000;

    private FragmentoInicioBinding componentes;
    private ViewModelInicio viewModel;

    /** A tela de comentários devolve o total real para a contagem do cartão. */
    private final ActivityResultLauncher<android.content.Intent> comentarios = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), resultado -> {
                android.content.Intent dados = resultado.getData();
                if (dados != null && viewModel != null) {
                    viewModel.definirTotalComentarios(dados.getStringExtra(TelaComentarios.EXTRA_PUBLICACAO_ID),
                            dados.getIntExtra(TelaComentarios.RESULTADO_TOTAL, -1));
                }
            });

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
        componentes.textoIniciaisCompositor.setText(Rotulos.iniciais(sessao != null ? sessao.getNome() : null));
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

    /** A aba fica no FragmentManager: ao voltar a ela, atualiza se algo novo foi publicado. */
    @Override
    public void onHiddenChanged(boolean oculto) {
        super.onHiddenChanged(oculto);
        if (!oculto && viewModel != null) {
            viewModel.carregarSeNecessario();
        }
    }

    private void mostrarPublicacoes(LayoutInflater inflador, List<Publicacao> publicacoes) {
        SessaoUsuario sessao = new GerenciadorSessao(requireContext()).obter();
        String meuId = sessao != null ? sessao.getIdUsuario() : null;
        float densidade = getResources().getDisplayMetrics().density;
        for (Publicacao publicacao : publicacoes) {
            ItemPublicacaoBinding item = ItemPublicacaoBinding.inflate(inflador, componentes.listaPublicacoes, false);
            String tipo = getString(publicacao.tipoAutor == TipoConta.EMPRESA
                    ? R.string.tipo_conta_empresa : R.string.tipo_conta_pessoa);
            item.textoIniciais.setText(Rotulos.iniciais(publicacao.nomeAutor));
            ExibidorImagem.avatar(item.imagemAvatar, publicacao.fotoAutorUrl, (int) (densidade * 48));
            item.textoAutor.setText(publicacao.nomeAutor);
            String detalhes = tipo + " · " + publicacao.quando;
            if (publicacao.editada) {
                detalhes += " · " + getString(R.string.publicacao_editada);
            }
            item.textoDetalhes.setText(detalhes);
            item.textoConteudo.setText(publicacao.conteudo);
            item.textoConteudo.setVisibility(publicacao.conteudo == null || publicacao.conteudo.trim().isEmpty()
                    ? View.GONE : View.VISIBLE);
            item.textoInteracoes.setText(getString(R.string.publicacao_contagem,
                    publicacao.curtidas, publicacao.comentarios));
            mostrarImagens(item, publicacao);

            // Autor: abre o perfil (o próprio, na aba Perfil). Sem conta conhecida, a linha só informa.
            if (publicacao.autorId != null) {
                item.linhaAutor.setContentDescription(getString(R.string.publicacao_abrir_autor, publicacao.nomeAutor)
                        + ", " + item.textoDetalhes.getText());
                item.linhaAutor.setOnClickListener(v -> abrirAutor(publicacao.autorId));
            } else {
                item.linhaAutor.setBackground(null);
            }

            // Editar e excluir: só nas publicações da própria conta.
            boolean propria = publicacao.autorId != null && publicacao.autorId.equalsIgnoreCase(meuId);
            item.botaoMais.setVisibility(propria ? View.VISIBLE : View.GONE);
            item.botaoMais.setOnClickListener(v -> abrirMenu(v, publicacao));

            // Curtir: ícone cheio e texto "Curtido" quando já curtiu (não depende só da cor).
            item.botaoCurtir.setText(publicacao.curtidoPorMim ? R.string.publicacao_curtido : R.string.publicacao_curtir);
            item.botaoCurtir.setIconResource(publicacao.curtidoPorMim ? R.drawable.ic_favorito : R.drawable.ic_favorito_contorno);
            int cor = requireContext().getColor(publicacao.curtidoPorMim ? R.color.acesso_erro : R.color.acesso_texto_secundario);
            item.botaoCurtir.setIconTint(ColorStateList.valueOf(cor));
            item.botaoCurtir.setOnClickListener(v -> viewModel.curtir(publicacao, erro ->
                    MensagemStatus.mostrarErro(componentes.mensagemStatus, erro)));
            item.botaoComentar.setOnClickListener(v -> comentarios.launch(TelaComentarios.intencao(
                    requireContext(), publicacao.id, publicacao.nomeAutor, publicacao.conteudo)));
            componentes.listaPublicacoes.addView(item.getRoot());
        }
    }

    /** Imagens anexadas; o texto alternativo é o que a pessoa escreveu ao publicar. */
    private void mostrarImagens(ItemPublicacaoBinding item, Publicacao publicacao) {
        item.listaImagens.removeAllViews();
        float densidade = getResources().getDisplayMetrics().density;
        int largura = getResources().getDisplayMetrics().widthPixels;
        for (Publicacao.Anexo anexo : publicacao.anexos) {
            ImageView imagem = new ImageView(requireContext());
            LinearLayoutParams.aplicar(imagem, (int) (densidade * 12));
            imagem.setAdjustViewBounds(true);
            imagem.setScaleType(ImageView.ScaleType.FIT_CENTER);
            imagem.setMaxHeight((int) (densidade * 420));
            imagem.setBackgroundResource(R.color.acesso_fundo_secundario);
            boolean temDescricao = anexo.descricao != null && !anexo.descricao.trim().isEmpty();
            imagem.setContentDescription(temDescricao
                    ? getString(R.string.publicacao_imagem_com_descricao, anexo.descricao.trim())
                    : getString(R.string.publicacao_imagem_sem_descricao));
            imagem.setVisibility(View.GONE);
            CarregadorImagem.carregar(imagem, anexo.url, largura,
                    exibiu -> imagem.setVisibility(exibiu ? View.VISIBLE : View.GONE));
            item.listaImagens.addView(imagem);
        }
    }

    private void abrirMenu(View ancora, Publicacao publicacao) {
        PopupMenu menu = new PopupMenu(requireContext(), ancora);
        menu.getMenu().add(0, 1, 0, R.string.publicacao_editar);
        menu.getMenu().add(0, 2, 1, R.string.publicacao_excluir);
        menu.setOnMenuItemClickListener(opcao -> {
            if (opcao.getItemId() == 1) {
                editar(publicacao);
            } else {
                confirmarExclusao(publicacao);
            }
            return true;
        });
        menu.show();
    }

    private void editar(Publicacao publicacao) {
        DialogoEditarPublicacaoBinding dialogo = DialogoEditarPublicacaoBinding.inflate(getLayoutInflater());
        dialogo.entradaTexto.setText(publicacao.conteudo);
        androidx.appcompat.app.AlertDialog alerta = new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.publicacao_editar_titulo)
                .setView(dialogo.getRoot())
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.publicacao_salvar, null)
                .create();
        alerta.show();
        // O botão é ligado depois de show() para o diálogo não fechar quando o texto é inválido.
        alerta.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String texto = String.valueOf(dialogo.entradaTexto.getText()).trim();
            if (texto.isEmpty()) {
                dialogo.campoTexto.setError(getString(R.string.publicacao_texto_vazio));
                return;
            }
            if (texto.length() > LIMITE_PUBLICACAO) {
                dialogo.campoTexto.setError(getString(R.string.publicacao_texto_longo));
                return;
            }
            dialogo.campoTexto.setError(null);
            alerta.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setEnabled(false);
            viewModel.editar(publicacao, texto, () -> {
                alerta.dismiss();
                if (componentes != null) {
                    MensagemStatus.mostrarSucesso(componentes.mensagemStatus, getString(R.string.publicacao_atualizada));
                }
            }, erro -> {
                alerta.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setEnabled(true);
                dialogo.campoTexto.setError(erro);
            });
        });
    }

    private void confirmarExclusao(Publicacao publicacao) {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.publicacao_excluir_titulo)
                .setMessage(R.string.publicacao_excluir_mensagem)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.comentarios_excluir, (dialogo, botao) -> viewModel.excluir(publicacao,
                        () -> {
                            if (componentes != null) {
                                MensagemStatus.mostrarSucesso(componentes.mensagemStatus,
                                        getString(R.string.publicacao_excluida));
                            }
                        },
                        erro -> {
                            if (componentes != null) {
                                MensagemStatus.mostrarErro(componentes.mensagemStatus, erro);
                            }
                        }))
                .show();
    }

    private void abrirAutor(String autorId) {
        SessaoUsuario sessao = new GerenciadorSessao(requireContext()).obter();
        if (sessao != null && autorId.equalsIgnoreCase(sessao.getIdUsuario())) {
            ((TelaPrincipal) requireActivity()).abrirPerfil();
        } else {
            TelaPerfilUsuario.abrir(requireContext(), autorId);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        componentes = null;
    }

    /** Margem superior das imagens da lista. */
    private static final class LinearLayoutParams {
        static void aplicar(ImageView imagem, int margemTopo) {
            android.widget.LinearLayout.LayoutParams parametros = new android.widget.LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            parametros.topMargin = margemTopo;
            imagem.setLayoutParams(parametros);
        }
    }
}
