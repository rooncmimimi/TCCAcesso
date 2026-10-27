package com.acesso.app.utilitarios;

import android.text.Editable;
import android.text.TextWatcher;
import android.widget.EditText;

/**
 * Máscaras de digitação (CPF, CNPJ, telefone e CEP), como o site faz em lib/mascaras.ts.
 * Só formatam o que aparece no campo: antes de enviar, o app usa Validador.somenteDigitos.
 */
public final class Mascaras {

    public static final String CPF = "###.###.###-##";
    public static final String CNPJ = "##.###.###/####-##";
    public static final String CEP = "#####-###";
    private static final String TELEFONE_FIXO = "(##) ####-####";
    private static final String TELEFONE_CELULAR = "(##) #####-####";

    private Mascaras() {
    }

    /** Aplica o padrão ("#" = dígito) aos dígitos do texto, ignorando o que passar do tamanho. */
    public static String formatar(String texto, String padrao) {
        String digitos = Validador.somenteDigitos(texto);
        StringBuilder resultado = new StringBuilder();
        int posicao = 0;
        for (char simbolo : padrao.toCharArray()) {
            if (posicao >= digitos.length()) {
                break;
            }
            if (simbolo == '#') {
                resultado.append(digitos.charAt(posicao++));
            } else {
                resultado.append(simbolo);
            }
        }
        return resultado.toString();
    }

    public static String formatarTelefone(String texto) {
        return formatar(texto, Validador.somenteDigitos(texto).length() > 10 ? TELEFONE_CELULAR : TELEFONE_FIXO);
    }

    public static void aplicar(EditText campo, String padrao) {
        campo.addTextChangedListener(new Formatador(campo, padrao));
    }

    public static void aplicarTelefone(EditText campo) {
        campo.addTextChangedListener(new Formatador(campo, null));
    }

    private static class Formatador implements TextWatcher {

        private final EditText campo;
        /** null = telefone (o padrão muda conforme a quantidade de dígitos). */
        private final String padrao;
        private boolean formatando;

        Formatador(EditText campo, String padrao) {
            this.campo = campo;
            this.padrao = padrao;
        }

        @Override
        public void beforeTextChanged(CharSequence texto, int inicio, int quantidade, int depois) {
        }

        @Override
        public void onTextChanged(CharSequence texto, int inicio, int antes, int quantidade) {
        }

        @Override
        public void afterTextChanged(Editable texto) {
            if (formatando) {
                return;
            }
            String atual = texto.toString();
            String formatado = padrao == null ? formatarTelefone(atual) : formatar(atual, padrao);
            if (!formatado.equals(atual)) {
                formatando = true;
                texto.replace(0, texto.length(), formatado);
                formatando = false;
            }
            campo.setSelection(campo.length());
        }
    }
}
