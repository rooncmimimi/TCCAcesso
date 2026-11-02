package com.acesso.app.utilitarios;

import android.graphics.Outline;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.widget.ImageView;

import com.acesso.app.R;

/**
 * Foto sobre as iniciais: a imagem só aparece depois de carregar, e as iniciais (que já estão na tela)
 * ficam como alternativa se a pessoa não tem foto ou o download falha. As imagens são decorativas para o
 * leitor de tela: o nome ao lado já identifica a conta.
 */
public final class ExibidorImagem {

    /** Recorta a foto em círculo (não depende do contorno do fundo da view). */
    private static final ViewOutlineProvider CIRCULO = new ViewOutlineProvider() {
        @Override
        public void getOutline(View view, Outline contorno) {
            contorno.setOval(0, 0, view.getWidth(), view.getHeight());
        }
    };

    private ExibidorImagem() {
    }

    public static void avatar(ImageView imagem, String url, int ladoPx) {
        imagem.setOutlineProvider(CIRCULO);
        imagem.setClipToOutline(true);
        carregar(imagem, url, ladoPx);
    }

    /** Logotipo da empresa sobre as iniciais, com os mesmos cantos arredondados do quadrado das iniciais. */
    public static void logo(ImageView imagem, String url, int ladoPx) {
        float raio = 10 * imagem.getResources().getDisplayMetrics().density;
        imagem.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline contorno) {
                contorno.setRoundRect(0, 0, view.getWidth(), view.getHeight(), raio);
            }
        });
        imagem.setClipToOutline(true);
        carregar(imagem, url, ladoPx);
    }

    /** Capa do perfil, sobre o raio decorativo. */
    public static void capa(ImageView imagem, String url, int ladoPx) {
        carregar(imagem, url, ladoPx);
    }

    private static void carregar(ImageView imagem, String url, int ladoPx) {
        imagem.setVisibility(View.GONE);
        if (url == null || url.trim().isEmpty()) {
            imagem.setTag(R.id.tag_url_imagem, null);
            return;
        }
        CarregadorImagem.carregar(imagem, url, ladoPx, exibiu -> imagem.setVisibility(exibiu ? View.VISIBLE : View.GONE));
    }
}
