package com.acesso.app.utilitarios;

import android.content.ContentResolver;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Prepara a imagem escolhida na galeria para o envio: lê pelo seletor do sistema (sem permissão de
 * armazenamento), corrige a rotação da câmera, reduz o lado maior e comprime em JPEG abaixo do limite do
 * servidor (5 MB por arquivo; o multer do backend recusa mais que isso). O servidor só aceita PNG, JPEG e
 * WebP, e JPEG serve para todas as origens (inclusive HEIC e outros formatos que a galeria entrega).
 * Rode fora da thread principal.
 */
public final class PreparadorImagem {

    /** Margem abaixo dos 5 MB do servidor. */
    private static final int LIMITE_BYTES = 4 * 1024 * 1024;

    /** Imagem não pôde ser lida ou não é uma imagem. */
    public static class ImagemInvalida extends IOException {
        public ImagemInvalida(String mensagem) {
            super(mensagem);
        }
    }

    private PreparadorImagem() {
    }

    /** @param ladoMaximo maior lado, em pixels, da imagem enviada (foto: 1024; capa: 1920). */
    public static byte[] prepararJpeg(ContentResolver resolvedor, Uri origem, int ladoMaximo) throws IOException {
        BitmapFactory.Options medidas = new BitmapFactory.Options();
        medidas.inJustDecodeBounds = true;
        try (InputStream entrada = resolvedor.openInputStream(origem)) {
            if (entrada == null) {
                throw new ImagemInvalida("Não foi possível abrir a imagem escolhida.");
            }
            BitmapFactory.decodeStream(entrada, null, medidas);
        }
        if (medidas.outWidth <= 0 || medidas.outHeight <= 0) {
            throw new ImagemInvalida("O arquivo escolhido não é uma imagem.");
        }
        BitmapFactory.Options opcoes = new BitmapFactory.Options();
        opcoes.inSampleSize = MedidasImagem.amostragem(medidas.outWidth, medidas.outHeight, ladoMaximo);
        Bitmap lida;
        try (InputStream entrada = resolvedor.openInputStream(origem)) {
            lida = entrada == null ? null : BitmapFactory.decodeStream(entrada, null, opcoes);
        } catch (OutOfMemoryError memoria) {
            throw new ImagemInvalida("A imagem é grande demais para este aparelho.");
        }
        if (lida == null) {
            throw new ImagemInvalida("O arquivo escolhido não é uma imagem.");
        }
        Bitmap pronta = ajustar(lida, rotacao(resolvedor, origem), ladoMaximo);
        return comprimir(pronta);
    }

    private static int rotacao(ContentResolver resolvedor, Uri origem) {
        try (InputStream entrada = resolvedor.openInputStream(origem)) {
            if (entrada == null) {
                return 0;
            }
            int orientacao = new ExifInterface(entrada)
                    .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            switch (orientacao) {
                case ExifInterface.ORIENTATION_ROTATE_90:
                    return 90;
                case ExifInterface.ORIENTATION_ROTATE_180:
                    return 180;
                case ExifInterface.ORIENTATION_ROTATE_270:
                    return 270;
                default:
                    return 0;
            }
        } catch (IOException | RuntimeException semExif) {
            return 0;
        }
    }

    /** Gira, limita o tamanho e põe sobre fundo branco (PNG com transparência viraria preto no JPEG). */
    private static Bitmap ajustar(Bitmap origem, int graus, int ladoMaximo) {
        int[] tamanho = MedidasImagem.limitar(origem.getWidth(), origem.getHeight(), ladoMaximo);
        Matrix matriz = new Matrix();
        matriz.postScale((float) tamanho[0] / origem.getWidth(), (float) tamanho[1] / origem.getHeight());
        if (graus != 0) {
            matriz.postRotate(graus);
        }
        Bitmap transformada = Bitmap.createBitmap(origem, 0, 0, origem.getWidth(), origem.getHeight(), matriz, true);
        Bitmap fundo = Bitmap.createBitmap(transformada.getWidth(), transformada.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas tela = new Canvas(fundo);
        tela.drawColor(Color.WHITE);
        tela.drawBitmap(transformada, 0, 0, null);
        if (transformada != origem) {
            origem.recycle();
        }
        transformada.recycle();
        return fundo;
    }

    private static byte[] comprimir(Bitmap imagem) throws IOException {
        for (int qualidade = 88; qualidade >= 48; qualidade -= 10) {
            ByteArrayOutputStream saida = new ByteArrayOutputStream();
            if (!imagem.compress(Bitmap.CompressFormat.JPEG, qualidade, saida)) {
                break;
            }
            if (saida.size() <= LIMITE_BYTES) {
                return saida.toByteArray();
            }
        }
        throw new ImagemInvalida("A imagem continua grande demais depois de reduzida. Escolha outra.");
    }
}
