package com.acesso.app.utilitarios;

import android.app.Activity;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

/**
 * Mantém o conteúdo fora da status bar, da barra de navegação e do teclado.
 *
 * A partir do Android 15 (targetSdk 35) o app sempre desenha atrás das barras e o
 * adjustResize deixa de encolher a tela sozinho. Aqui o app trata isso do mesmo
 * jeito em todas as versões: a raiz ganha as margens das barras e, com o teclado
 * aberto, a altura dele embaixo. Como as telas rolam (ScrollView), o campo em foco
 * e o botão de enviar continuam alcançáveis acima do teclado.
 */
public final class MargensSistema {

    private MargensSistema() {
    }

    public static void aplicar(Activity tela, View raiz) {
        WindowCompat.setDecorFitsSystemWindows(tela.getWindow(), false);
        WindowCompat.getInsetsController(tela.getWindow(), tela.getWindow().getDecorView())
                .setAppearanceLightStatusBars(true);

        int esquerda = raiz.getPaddingLeft();
        int topo = raiz.getPaddingTop();
        int direita = raiz.getPaddingRight();
        int base = raiz.getPaddingBottom();

        ViewCompat.setOnApplyWindowInsetsListener(raiz, (view, margens) -> {
            Insets barras = margens.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets teclado = margens.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(esquerda + barras.left, topo + barras.top, direita + barras.right,
                    base + Math.max(barras.bottom, teclado.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
