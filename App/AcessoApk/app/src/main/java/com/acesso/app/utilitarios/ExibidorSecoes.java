package com.acesso.app.utilitarios;

import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.StringRes;

import com.acesso.app.databinding.ComponenteSecaoBinding;
import com.acesso.app.databinding.ItemCurriculoBinding;
import com.acesso.app.modelos.PerfilConta;

import java.util.List;

/**
 * Preenche um componente_secao (cartão com título) com texto, selos ou lista. Seção sem conteúdo fica
 * escondida: nada de "Não informado" espalhado pela tela. Cada método devolve se a seção apareceu.
 */
public final class ExibidorSecoes {

    private ExibidorSecoes() {
    }

    public static boolean texto(ComponenteSecaoBinding secao, @StringRes int titulo, String texto) {
        boolean tem = temTexto(texto);
        prepararTitulo(secao, titulo, tem);
        secao.textoSecao.setText(tem ? texto.trim() : null);
        secao.textoSecao.setVisibility(tem ? View.VISIBLE : View.GONE);
        return tem;
    }

    /** Várias linhas curtas num mesmo cartão (ex.: "Salário: ...", "Contrato: ..."), sem as vazias. */
    public static boolean linhas(ComponenteSecaoBinding secao, @StringRes int titulo, List<String> linhas) {
        StringBuilder texto = new StringBuilder();
        for (String linha : linhas) {
            if (temTexto(linha)) {
                texto.append(texto.length() > 0 ? "\n" : "").append(linha.trim());
            }
        }
        return texto(secao, titulo, texto.toString());
    }

    public static boolean selos(ComponenteSecaoBinding secao, @StringRes int titulo, List<String> selos) {
        boolean tem = selos != null && !selos.isEmpty();
        prepararTitulo(secao, titulo, tem);
        secao.grupoSelosSecao.removeAllViews();
        if (tem) {
            for (String selo : selos) {
                CartaoVaga.adicionarSelo(secao.grupoSelosSecao, selo, false);
            }
        }
        secao.grupoSelosSecao.setVisibility(tem ? View.VISIBLE : View.GONE);
        return tem;
    }

    public static boolean curriculo(ComponenteSecaoBinding secao, @StringRes int titulo,
                                    List<PerfilConta.ItemCurriculo> itens, LayoutInflater inflador) {
        boolean tem = itens != null && !itens.isEmpty();
        prepararTitulo(secao, titulo, tem);
        secao.listaSecao.removeAllViews();
        if (tem) {
            for (PerfilConta.ItemCurriculo item : itens) {
                ItemCurriculoBinding linha = ItemCurriculoBinding.inflate(inflador, secao.listaSecao, false);
                mostrar(linha.textoTitulo, item.titulo);
                mostrar(linha.textoSubtitulo, item.subtitulo);
                mostrar(linha.textoPeriodo, item.periodo);
                mostrar(linha.textoDescricao, item.descricao);
                secao.listaSecao.addView(linha.getRoot());
            }
        }
        secao.listaSecao.setVisibility(tem ? View.VISIBLE : View.GONE);
        return tem;
    }

    /** Seção cujo conteúdo é uma lista de views montada por quem chama (ex.: cartões de vaga). */
    public static void lista(ComponenteSecaoBinding secao, @StringRes int titulo, List<View> itens) {
        boolean tem = itens != null && !itens.isEmpty();
        prepararTitulo(secao, titulo, tem);
        secao.listaSecao.removeAllViews();
        if (tem) {
            for (View item : itens) {
                secao.listaSecao.addView(item);
            }
        }
        secao.listaSecao.setVisibility(tem ? View.VISIBLE : View.GONE);
    }

    private static void prepararTitulo(ComponenteSecaoBinding secao, @StringRes int titulo, boolean visivel) {
        secao.tituloSecao.setText(titulo);
        secao.getRoot().setVisibility(visivel ? View.VISIBLE : View.GONE);
    }

    /** Texto opcional numa linha própria: vazio esconde a linha. */
    public static void mostrar(TextView campo, String texto) {
        campo.setText(temTexto(texto) ? texto.trim() : null);
        campo.setVisibility(temTexto(texto) ? View.VISIBLE : View.GONE);
    }

    public static boolean temTexto(String texto) {
        return texto != null && !texto.trim().isEmpty();
    }
}
