package com.acesso.app.utilitarios;

/** Contas de tamanho de imagem, sem Android, para testar com JUnit. */
public final class MedidasImagem {

    private MedidasImagem() {
    }

    /**
     * Maior potência de 2 (fator de {@code inSampleSize}) que ainda deixa o lado maior com pelo menos
     * {@code ladoAlvo} pixels: a imagem é decodificada menor sem ficar mais pobre que o necessário.
     */
    public static int amostragem(int largura, int altura, int ladoAlvo) {
        if (largura <= 0 || altura <= 0 || ladoAlvo <= 0) {
            return 1;
        }
        int maior = Math.max(largura, altura);
        int fator = 1;
        while (maior / (fator * 2) >= ladoAlvo) {
            fator *= 2;
        }
        return fator;
    }

    /** Tamanho final com o lado maior limitado a {@code ladoMaximo}, mantendo a proporção. Nunca amplia. */
    public static int[] limitar(int largura, int altura, int ladoMaximo) {
        int maior = Math.max(largura, altura);
        if (maior <= ladoMaximo || maior <= 0) {
            return new int[]{largura, altura};
        }
        double escala = (double) ladoMaximo / maior;
        return new int[]{Math.max(1, (int) Math.round(largura * escala)), Math.max(1, (int) Math.round(altura * escala))};
    }

    /**
     * Endereço que o app pode abrir: http(s) completo ou caminho da API ({@code /uploads/...}, usado quando o
     * servidor guarda arquivos em disco) resolvido contra o servidor de {@code urlApi}. Qualquer outro esquema
     * (file:, content:, javascript:) dá nulo.
     */
    public static String resolverUrl(String urlApi, String url) {
        if (url == null) {
            return null;
        }
        String limpa = url.trim();
        String minuscula = limpa.toLowerCase(java.util.Locale.ROOT);
        if (minuscula.startsWith("https://") || minuscula.startsWith("http://")) {
            return limpa;
        }
        if (limpa.startsWith("/") && !limpa.startsWith("//") && urlApi != null) {
            int inicioHost = urlApi.indexOf("://");
            if (inicioHost < 0) {
                return null;
            }
            int fimHost = urlApi.indexOf('/', inicioHost + 3);
            String origem = fimHost < 0 ? urlApi : urlApi.substring(0, fimHost);
            return origem + limpa;
        }
        return null;
    }
}
