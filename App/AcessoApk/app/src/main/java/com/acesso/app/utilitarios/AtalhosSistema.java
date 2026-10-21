package com.acesso.app.utilitarios;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.acesso.app.R;

/**
 * Atalhos para telas de fora do app, usados na apresentação, no perfil e na
 * tela de empresa em análise: configurações de acessibilidade e e-mail da equipe.
 */
public final class AtalhosSistema {

    private AtalhosSistema() {
    }

    /** Abre as configurações de acessibilidade do Android (ou as gerais, se o fabricante não tiver a tela). */
    public static void abrirConfiguracoesAcessibilidade(Context contexto) {
        try {
            contexto.startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        } catch (ActivityNotFoundException semTela) {
            contexto.startActivity(new Intent(Settings.ACTION_SETTINGS));
        }
    }

    /**
     * Abre o app de e-mail já com o endereço da equipe do ACESSO.
     *
     * @return false quando não há app de e-mail; a tela mostra o endereço por escrito.
     */
    public static boolean escreverParaEquipe(Context contexto) {
        Intent email = new Intent(Intent.ACTION_SENDTO,
                Uri.parse("mailto:" + contexto.getString(R.string.perfil_email_contato)));
        try {
            contexto.startActivity(email);
            return true;
        } catch (ActivityNotFoundException semApp) {
            return false;
        }
    }
}
