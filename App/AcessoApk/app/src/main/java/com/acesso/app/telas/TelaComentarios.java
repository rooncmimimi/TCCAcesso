package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ItemComentarioBinding;
import com.acesso.app.databinding.TelaComentariosBinding;
import com.acesso.app.modelos.Comentario;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.ExibidorImagem;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.EstadoConteudo;
import com.acesso.app.viewmodels.ViewModelComentarios;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.List;

/**
 * Comentários de uma publicação (GET/POST /api/postagens/:id/comentarios, DELETE /api/comentarios/:id): lista com
 * respostas em um nível, enviar comentário ou resposta e excluir os próprios. Ao voltar, devolve o total
 * atualizado para o feed corrigir a contagem sem recarregar tudo.
 */
public class TelaComentarios extends TelaAutenticada {

    public static final String EXTRA_PUBLICACAO_ID = "publicacao_id";
    /** Resultado: total de comentários e respostas depois de entrar na tela. */
    public static final String RESULTADO_TOTAL = "total_comentarios";

    private static final String EXTRA_AUTOR = "autor";
    private static final String EXTRA_CONTEUDO = "conteudo";

    private TelaComentariosBinding componentes;
    private ViewModelComentarios viewModel;
    /** Comentário (de primeiro nível) que a resposta em escrita vai responder; nulo = comentário novo. */
    private String respondendoId;

    public static Intent intencao(Context contexto, String publicacaoId, String autor, String conteudo) {
        return new Intent(contexto, TelaComentarios.class)
                .putExtra(EXTRA_PUBLICACAO_ID, publicacaoId)
                .putExtra(EXTRA_AUTOR, autor)
                .putExtra(EXTRA_CONTEUDO, conteudo);
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        String publicacaoId = getIntent().getStringExtra(EXTRA_PUBLICACAO_ID);
        if (!sessaoValida() || publicacaoId == null) {
            finish();
            return;
        }
        componentes = TelaComentariosBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.raiz);
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());

        String autor = getIntent().getStringExtra(EXTRA_AUTOR);
        componentes.textoAutorPublicacao.setText(autor);
        componentes.textoConteudoPublicacao.setText(getIntent().getStringExtra(EXTRA_CONTEUDO));
        componentes.resumoPublicacao.setContentDescription(autor + ": " + getIntent().getStringExtra(EXTRA_CONTEUDO));

        viewModel = new ViewModelProvider(this).get(ViewModelComentarios.class);
        viewModel.getComentarios().observe(this, this::mostrarComentarios);
        viewModel.getEnviando().observe(this, enviando -> atualizarBotaoEnviar());

        componentes.entradaComentario.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence texto, int inicio, int quantos, int depois) {
            }

            @Override
            public void onTextChanged(CharSequence texto, int inicio, int antes, int quantos) {
                atualizarBotaoEnviar();
                componentes.campoComentario.setCounterEnabled(texto.length() > 900);
            }

            @Override
            public void afterTextChanged(Editable texto) {
            }
        });
        componentes.botaoCancelarResposta.setOnClickListener(v -> definirResposta(null, null));
        componentes.botaoEnviar.setOnClickListener(v -> enviar());

        viewModel.iniciar(publicacaoId);
    }

    private void enviar() {
        MensagemStatus.esconder(componentes.mensagemStatus);
        viewModel.enviar(String.valueOf(componentes.entradaComentario.getText()), respondendoId,
                () -> {
                    componentes.entradaComentario.setText(null);
                    definirResposta(null, null);
                    MensagemStatus.mostrarSucesso(componentes.mensagemStatus, getString(R.string.comentarios_enviado));
                },
                erro -> MensagemStatus.mostrarErro(componentes.mensagemStatus, erro));
    }

    private void definirResposta(String comentarioId, String nomeAutor) {
        respondendoId = comentarioId;
        boolean respondendo = comentarioId != null;
        componentes.faixaResposta.setVisibility(respondendo ? View.VISIBLE : View.GONE);
        if (respondendo) {
            componentes.textoRespondendo.setText(getString(R.string.comentarios_respondendo, nomeAutor));
            componentes.entradaComentario.requestFocus();
        }
    }

    private void mostrarComentarios(EstadoConteudo<List<Comentario>> estado) {
        boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
        boolean temItens = ExibidorEstado.mostrar(componentes.estado, estado, vazio,
                getString(R.string.comentarios_vazio), viewModel::carregar);
        componentes.listaComentarios.removeAllViews();
        if (estado != null && estado.dados != null) {
            setResult(RESULT_OK, new Intent().putExtra(EXTRA_PUBLICACAO_ID,
                    getIntent().getStringExtra(EXTRA_PUBLICACAO_ID)).putExtra(RESULTADO_TOTAL, viewModel.total()));
        }
        if (!temItens) {
            return;
        }
        for (Comentario comentario : estado.dados) {
            componentes.listaComentarios.addView(criarItem(comentario, null, componentes.listaComentarios));
        }
    }

    /**
     * @param raiz comentário de primeiro nível a que este pertence (nulo se ele mesmo é de primeiro nível).
     *             Respostas a respostas viram respostas do comentário de primeiro nível, como na API.
     */
    private View criarItem(Comentario comentario, Comentario raiz, android.view.ViewGroup pai) {
        ItemComentarioBinding item = ItemComentarioBinding.inflate(getLayoutInflater(), pai, false);
        String nome = comentario.nomeAutor != null ? comentario.nomeAutor : getString(R.string.mensagens_usuario_removido);
        item.textoIniciais.setText(Rotulos.iniciais(comentario.nomeAutor));
        ExibidorImagem.avatar(item.imagemAvatar, comentario.fotoAutorUrl,
                (int) (getResources().getDisplayMetrics().density * 48));
        item.textoAutor.setText(nome);
        String quando = comentario.editado
                ? comentario.quando + " · " + getString(R.string.comentarios_editado) : comentario.quando;
        item.textoQuando.setText(quando);
        item.textoComentario.setText(comentario.texto);
        item.balao.setContentDescription(nome + ", " + quando + ": " + comentario.texto);
        item.textoAutor.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        item.textoQuando.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        item.textoComentario.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);

        Comentario alvoDaResposta = raiz != null ? raiz : comentario;
        item.botaoResponder.setContentDescription(getString(R.string.comentarios_responder_a, nome));
        item.botaoResponder.setOnClickListener(v -> definirResposta(alvoDaResposta.id, nome));

        boolean meu = comentario.autorId != null && comentario.autorId.equalsIgnoreCase(viewModel.getMeuId());
        item.botaoExcluir.setVisibility(meu ? View.VISIBLE : View.GONE);
        item.botaoExcluir.setContentDescription(getString(R.string.comentarios_excluir_a, nome));
        item.botaoExcluir.setOnClickListener(v -> confirmarExclusao(comentario));

        // Quem escreveu pode abrir o perfil tocando no nome (se não for o próprio).
        if (comentario.autorId != null && !meu) {
            item.balao.setOnClickListener(v -> TelaPerfilUsuario.abrir(this, comentario.autorId));
        }
        if (raiz == null) {
            for (Comentario resposta : comentario.respostas) {
                item.listaRespostas.addView(criarItem(resposta, comentario, item.listaRespostas));
            }
        }
        return item.getRoot();
    }

    private void confirmarExclusao(Comentario comentario) {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.comentarios_excluir_titulo)
                .setMessage(R.string.comentarios_excluir_mensagem)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.comentarios_excluir, (dialogo, botao) -> viewModel.excluir(comentario,
                        () -> MensagemStatus.mostrarSucesso(componentes.mensagemStatus,
                                getString(R.string.comentarios_excluido)),
                        erro -> MensagemStatus.mostrarErro(componentes.mensagemStatus, erro)))
                .show();
    }

    private void atualizarBotaoEnviar() {
        boolean temTexto = componentes.entradaComentario.getText() != null
                && componentes.entradaComentario.getText().toString().trim().length() > 0;
        boolean enviando = Boolean.TRUE.equals(viewModel.getEnviando().getValue());
        componentes.botaoEnviar.setEnabled(temTexto && !enviando);
    }
}
