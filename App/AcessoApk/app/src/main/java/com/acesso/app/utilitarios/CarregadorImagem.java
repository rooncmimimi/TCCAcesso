package com.acesso.app.utilitarios;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.widget.ImageView;

import com.acesso.app.BuildConfig;
import com.acesso.app.R;
import com.acesso.app.servicos.ClienteHttp;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Baixa e mostra imagens (foto, capa, anexos) sem biblioteca externa: OkHttp para baixar, decodificação já
 * reduzida ao tamanho da tela e um cache em memória. As URLs são as públicas (ou assinadas) que a API devolve;
 * o token do usuário nunca vai junto.
 */
public final class CarregadorImagem {

    /** Avisa se a imagem apareceu; chamado na thread principal, só se a view ainda espera esta URL. */
    public interface Resultado {
        void aoTerminar(boolean exibiu);
    }

    private static final int LIMITE_BYTES = 12 * 1024 * 1024;
    private static final ExecutorService POOL = Executors.newFixedThreadPool(3);
    private static final Handler PRINCIPAL = new Handler(Looper.getMainLooper());
    private static final LruCache<String, Bitmap> CACHE = new LruCache<String, Bitmap>(
            (int) Math.min(Runtime.getRuntime().maxMemory() / 8, 48L * 1024 * 1024)) {
        @Override
        protected int sizeOf(String chave, Bitmap imagem) {
            return imagem.getByteCount();
        }
    };

    private CarregadorImagem() {
    }

    /**
     * Mostra {@code url} em {@code imagem}. A imagem é decodificada com o lado maior perto de
     * {@code ladoAlvoPx}. Sem URL válida, esvazia a view e avisa {@code exibiu = false}.
     */
    public static void carregar(ImageView imagem, String url, int ladoAlvoPx, Resultado resultado) {
        String completa = MedidasImagem.resolverUrl(BuildConfig.URL_API, url);
        imagem.setTag(R.id.tag_url_imagem, completa);
        if (completa == null) {
            imagem.setImageDrawable(null);
            avisar(resultado, false);
            return;
        }
        Bitmap guardada = CACHE.get(completa);
        if (guardada != null) {
            imagem.setImageBitmap(guardada);
            avisar(resultado, true);
            return;
        }
        imagem.setImageDrawable(null);
        POOL.execute(() -> {
            Bitmap baixada = baixar(completa, ladoAlvoPx);
            PRINCIPAL.post(() -> {
                if (!completa.equals(imagem.getTag(R.id.tag_url_imagem))) {
                    return;
                }
                if (baixada != null) {
                    CACHE.put(completa, baixada);
                    imagem.setImageBitmap(baixada);
                }
                avisar(resultado, baixada != null);
            });
        });
    }

    /** Guarda no cache uma imagem que o app já tem (acabou de enviar), para aparecer sem baixar de novo. */
    public static void guardar(String url, Bitmap imagem) {
        String completa = MedidasImagem.resolverUrl(BuildConfig.URL_API, url);
        if (completa != null && imagem != null) {
            CACHE.put(completa, imagem);
        }
    }

    private static void avisar(Resultado resultado, boolean exibiu) {
        if (resultado != null) {
            resultado.aoTerminar(exibiu);
        }
    }

    private static Bitmap baixar(String url, int ladoAlvoPx) {
        Request requisicao;
        try {
            requisicao = new Request.Builder().url(url).header("Accept", "image/*").build();
        } catch (IllegalArgumentException invalida) {
            return null;
        }
        try (Response resposta = ClienteHttp.http().newCall(requisicao).execute()) {
            ResponseBody corpo = resposta.body();
            if (!resposta.isSuccessful() || corpo == null || corpo.contentLength() > LIMITE_BYTES) {
                return null;
            }
            byte[] bytes = corpo.bytes();
            if (bytes.length > LIMITE_BYTES) {
                return null;
            }
            BitmapFactory.Options medidas = new BitmapFactory.Options();
            medidas.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, medidas);
            BitmapFactory.Options opcoes = new BitmapFactory.Options();
            opcoes.inSampleSize = MedidasImagem.amostragem(medidas.outWidth, medidas.outHeight, ladoAlvoPx);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opcoes);
        } catch (IOException | RuntimeException falha) {
            return null;
        }
    }
}
