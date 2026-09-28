package com.acesso.app.utils;

import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.acesso.app.R;

/**
 * Mostra mensagens de erro, sucesso ou carregamento no mesmo lugar da tela.
 * Erro e sucesso têm ícone e texto, não só cor, e o TalkBack lê a mensagem
 * sozinho porque o TextView é uma "live region".
 */
public final class StatusMessage {

    private StatusMessage() {
    }

    public static void showError(TextView view, String message) {
        show(view, message, R.drawable.bg_status_error, R.drawable.ic_error, R.color.acesso_on_error_container);
    }

    public static void showSuccess(TextView view, String message) {
        show(view, message, R.drawable.bg_status_success, R.drawable.ic_check_circle, R.color.acesso_success);
    }

    /** Texto de andamento, ex.: "Entrando…". */
    public static void showProgress(TextView view, String message) {
        view.setBackground(null);
        view.setCompoundDrawablesRelativeWithIntrinsicBounds(0, 0, 0, 0);
        view.setTextColor(ContextCompat.getColor(view.getContext(), R.color.acesso_text_secondary));
        view.setText(message);
        view.setVisibility(TextView.VISIBLE);
    }

    public static void hide(TextView view) {
        view.setText(null);
        view.setVisibility(TextView.GONE);
    }

    private static void show(TextView view, String message, int background, int icon, int textColor) {
        view.setBackgroundResource(background);
        view.setCompoundDrawablesRelativeWithIntrinsicBounds(icon, 0, 0, 0);
        view.setTextColor(ContextCompat.getColor(view.getContext(), textColor));
        view.setText(message);
        view.setVisibility(TextView.VISIBLE);
    }
}
