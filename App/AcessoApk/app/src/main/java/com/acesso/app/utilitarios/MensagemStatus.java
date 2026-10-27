package com.acesso.app.utilitarios;

import android.content.res.ColorStateList;
import android.view.View;
import android.widget.TextView;

import androidx.core.content.ContextCompat;
import androidx.core.widget.TextViewCompat;

import com.acesso.app.R;

/**
 * Mostra mensagens de erro, sucesso ou carregamento no mesmo lugar da tela.
 * Erro e sucesso têm ícone e texto, não só cor, e o TalkBack lê a mensagem
 * sozinho porque o TextView é uma "live region".
 */
public final class MensagemStatus {

    private MensagemStatus() {
    }

    public static void mostrarErro(TextView texto, String mensagem) {
        mostrar(texto, mensagem, R.drawable.fundo_status_erro, R.drawable.ic_erro, R.color.acesso_sobre_container_erro);
    }

    public static void mostrarSucesso(TextView texto, String mensagem) {
        mostrar(texto, mensagem, R.drawable.fundo_status_sucesso, R.drawable.ic_sucesso, R.color.acesso_sucesso);
    }

    /** Aviso que não é erro, ex.: "esta ação ainda depende da integração com a API". */
    public static void mostrarAviso(TextView texto, String mensagem) {
        mostrar(texto, mensagem, R.drawable.fundo_aviso, R.drawable.ic_informacao, R.color.acesso_sobre_container_aviso);
        TextViewCompat.setCompoundDrawableTintList(texto,
                ColorStateList.valueOf(ContextCompat.getColor(texto.getContext(), R.color.acesso_sobre_container_aviso)));
    }

    /** Texto de andamento, ex.: "Entrando…". */
    public static void mostrarAndamento(TextView texto, String mensagem) {
        texto.setBackground(null);
        texto.setCompoundDrawablesRelativeWithIntrinsicBounds(0, 0, 0, 0);
        texto.setTextColor(ContextCompat.getColor(texto.getContext(), R.color.acesso_texto_secundario));
        texto.setText(mensagem);
        texto.setVisibility(View.VISIBLE);
    }

    public static void esconder(TextView texto) {
        texto.setText(null);
        texto.setVisibility(View.GONE);
    }

    private static void mostrar(TextView texto, String mensagem, int fundo, int icone, int corTexto) {
        texto.setBackgroundResource(fundo);
        // Tira a cor que um aviso anterior possa ter aplicado ao ícone.
        TextViewCompat.setCompoundDrawableTintList(texto, null);
        texto.setCompoundDrawablesRelativeWithIntrinsicBounds(icone, 0, 0, 0);
        texto.setTextColor(ContextCompat.getColor(texto.getContext(), corTexto));
        texto.setText(mensagem);
        texto.setVisibility(View.VISIBLE);
    }
}
