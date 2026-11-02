package com.acesso.app.utilitarios;

import android.content.res.ColorStateList;
import android.view.View;

import androidx.core.content.ContextCompat;
import androidx.core.widget.TextViewCompat;

import com.acesso.app.R;
import com.acesso.app.databinding.ComponenteEstadoConteudoBinding;
import com.acesso.app.viewmodels.EstadoConteudo;

/**
 * Mostra o estado de uma lista no componente_estado_conteudo:
 * carregando (indicador), vazio (texto), integração pendente (aviso amarelo,
 * sem "Tentar novamente", porque tentar de novo não muda nada) ou erro (aviso
 * vermelho com "Tentar novamente").
 */
public final class ExibidorEstado {

    private ExibidorEstado() {
    }

    /**
     * @param vazio        true quando a lista carregou mas não tem itens.
     * @param mensagemVazio texto para a lista vazia.
     * @return true quando há dados para mostrar.
     */
    public static boolean mostrar(ComponenteEstadoConteudoBinding componente, EstadoConteudo<?> estado,
                                  boolean vazio, String mensagemVazio, Runnable tentarNovamente) {
        componente.progresso.setVisibility(estado != null && estado.carregando ? View.VISIBLE : View.GONE);
        componente.botaoTentarNovamente.setVisibility(View.GONE);
        componente.textoEstado.setVisibility(View.GONE);

        if (estado == null || estado.carregando) {
            return false;
        }
        if (estado.mensagem != null) {
            if (estado.integracaoPendente()) {
                estilizarAviso(componente, R.drawable.fundo_aviso, R.drawable.ic_informacao,
                        R.color.acesso_sobre_container_aviso);
            } else {
                estilizarAviso(componente, R.drawable.fundo_status_erro, R.drawable.ic_erro,
                        R.color.acesso_sobre_container_erro);
                componente.botaoTentarNovamente.setVisibility(View.VISIBLE);
                componente.botaoTentarNovamente.setOnClickListener(v -> tentarNovamente.run());
            }
            componente.textoEstado.setText(estado.mensagem);
            componente.textoEstado.setVisibility(View.VISIBLE);
            return false;
        }
        if (vazio) {
            estilizarAviso(componente, R.drawable.fundo_aviso, R.drawable.ic_informacao,
                    R.color.acesso_sobre_container_aviso);
            componente.textoEstado.setText(mensagemVazio);
            componente.textoEstado.setVisibility(View.VISIBLE);
            return false;
        }
        return true;
    }

    private static void estilizarAviso(ComponenteEstadoConteudoBinding componente, int fundo, int icone, int cor) {
        int corTexto = ContextCompat.getColor(componente.getRoot().getContext(), cor);
        componente.textoEstado.setBackgroundResource(fundo);
        componente.textoEstado.setTextColor(corTexto);
        componente.textoEstado.setCompoundDrawablesRelativeWithIntrinsicBounds(icone, 0, 0, 0);
        TextViewCompat.setCompoundDrawableTintList(componente.textoEstado,
                ColorStateList.valueOf(corTexto));
    }
}
