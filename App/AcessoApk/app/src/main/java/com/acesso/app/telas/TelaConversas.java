package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.View;

import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ItemConversaBinding;
import com.acesso.app.databinding.TelaConversasBinding;
import com.acesso.app.modelos.Conversa;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelConversas;

/**
 * Lista de conversas (página /mensagens do site): a mais recente em cima, com a prévia da última mensagem
 * e o número de não lidas. "Nova mensagem" abre a pesquisa para achar a pessoa ou empresa.
 */
public class TelaConversas extends TelaAutenticada {

    private TelaConversasBinding componentes;
    private ViewModelConversas viewModel;

    public static void abrir(Context contexto) {
        contexto.startActivity(new Intent(contexto, TelaConversas.class));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        if (!sessaoValida()) {
            return;
        }
        componentes = TelaConversasBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.raiz);
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
        componentes.botaoNovaMensagem.setOnClickListener(v -> TelaPesquisa.abrir(this));

        viewModel = new ViewModelProvider(this).get(ViewModelConversas.class);
        viewModel.getConversas().observe(this, estado -> {
            componentes.listaConversas.removeAllViews();
            boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
            boolean temItens = ExibidorEstado.mostrar(componentes.estado, estado, vazio,
                    getString(R.string.mensagens_vazio), viewModel::carregar);
            componentes.cartaoLista.setVisibility(temItens ? View.VISIBLE : View.GONE);
            if (temItens) {
                for (Conversa conversa : estado.dados) {
                    componentes.listaConversas.addView(criarItem(conversa));
                }
            }
        });
    }

    /** Ao voltar de uma conversa, a lista (prévias e não lidas) é atualizada. */
    @Override
    protected void onResume() {
        super.onResume();
        if (viewModel != null) {
            viewModel.carregar();
        }
    }

    private View criarItem(Conversa conversa) {
        ItemConversaBinding item = ItemConversaBinding.inflate(getLayoutInflater(), componentes.listaConversas, false);
        String nome = conversa.outroRemovido() || conversa.nomeOutro == null
                ? getString(R.string.mensagens_usuario_removido) : conversa.nomeOutro;
        String previa = conversa.previa != null ? conversa.previa : getString(R.string.mensagens_sem_previa);
        item.textoIniciais.setText(Rotulos.iniciais(conversa.outroRemovido() ? null : nome));
        item.textoNome.setText(nome);
        item.textoPrevia.setText(previa);
        item.textoQuando.setText(conversa.quando);
        boolean naoLida = conversa.naoLidas > 0;
        // Não lida: nome e prévia em negrito, fundo destacado e o número (não só a cor).
        item.textoNome.setTypeface(null, naoLida ? Typeface.BOLD : Typeface.NORMAL);
        item.textoPrevia.setTypeface(null, naoLida ? Typeface.BOLD : Typeface.NORMAL);
        item.textoPrevia.setTextColor(getColor(naoLida ? R.color.acesso_texto : R.color.acesso_texto_secundario));
        if (naoLida) {
            item.conteudoItem.setBackgroundResource(R.drawable.fundo_item_nao_lido);
            item.seloNaoLidas.setText(Rotulos.contador(conversa.naoLidas));
            item.seloNaoLidas.setVisibility(View.VISIBLE);
        }
        StringBuilder descricao = new StringBuilder(nome).append(", ").append(previa);
        if (conversa.quando != null && !conversa.quando.isEmpty()) {
            descricao.append(", ").append(conversa.quando);
        }
        if (naoLida) {
            descricao.append(", ").append(getResources().getQuantityString(
                    R.plurals.mensagens_nao_lidas, conversa.naoLidas, conversa.naoLidas));
        }
        item.conteudoItem.setContentDescription(descricao);
        item.conteudoItem.setOnClickListener(v -> TelaConversa.abrir(this, conversa.id));
        return item.getRoot();
    }
}
