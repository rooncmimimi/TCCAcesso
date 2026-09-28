package com.acesso.app.utilitarios;

import android.view.View;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

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
        texto.setCompoundDrawablesRelativeWithIntrinsicBounds(icone, 0, 0, 0);
        texto.setTextColor(ContextCompat.getColor(texto.getContext(), corTexto));
        texto.setText(mensagem);
        texto.setVisibility(View.VISIBLE);
    }
}
