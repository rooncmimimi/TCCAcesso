package com.acesso.app.utilitarios;

import android.content.Context;
import android.view.View;

import com.acesso.app.R;
import com.acesso.app.databinding.ItemVagaBinding;
import com.acesso.app.modelos.Vaga;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;

import java.util.ArrayList;
import java.util.List;

/**
 * Preenche o cartão de vaga (item_vaga, como o VagaCard do site). Usado na aba Vagas, no Painel da
 * empresa e nas vagas abertas do perfil de uma empresa, para o cartão ser igual em todo lugar.
 */
public final class CartaoVaga {

    private CartaoVaga() {
    }

    public static void preencher(ItemVagaBinding item, Vaga vaga, boolean mostrarCandidaturas) {
        Context contexto = item.getRoot().getContext();
        item.textoTitulo.setText(vaga.titulo);
        item.textoIniciaisEmpresa.setText(Rotulos.iniciais(vaga.nomeEmpresa));
        ExibidorImagem.logo(item.imagemLogoEmpresa, vaga.logoEmpresaUrl,
                contexto.getResources().getDimensionPixelSize(R.dimen.tamanho_logo_empresa));
        item.textoEmpresa.setText(vaga.nomeEmpresa);
        if (vaga.empresaVerificada) {
            item.textoEmpresa.setCompoundDrawablesRelativeWithIntrinsicBounds(0, 0, R.drawable.ic_verificado, 0);
            item.textoEmpresa.setContentDescription(vaga.nomeEmpresa + ", "
                    + contexto.getString(R.string.vaga_empresa_verificada));
        }
        item.textoLocal.setText(local(contexto, vaga));
        item.textoDescricao.setText(vaga.descricao);

        if (vaga.publicoAlvo != null && !"geral".equals(vaga.publicoAlvo) && Rotulos.de(vaga.publicoAlvo) != 0) {
            adicionarSelo(item.grupoSelos, contexto.getString(Rotulos.de(vaga.publicoAlvo)), true);
        }
        if (Rotulos.de(vaga.contrato) != 0) {
            adicionarSelo(item.grupoSelos, contexto.getString(Rotulos.de(vaga.contrato)), false);
        }
        // Como no site: até 3 recursos no cartão, sem o genérico "outro".
        int recursos = 0;
        for (String recurso : vaga.recursosAcessibilidade) {
            if (!"outro".equals(recurso) && Rotulos.de(recurso) != 0 && recursos < 3) {
                adicionarSelo(item.grupoSelos, contexto.getString(Rotulos.de(recurso)), false);
                recursos++;
            }
        }
        if (mostrarCandidaturas) {
            item.textoCandidaturas.setText(contexto.getString(R.string.vaga_candidaturas, vaga.totalCandidaturas));
            item.textoCandidaturas.setVisibility(View.VISIBLE);
        }
    }

    /** "Remoto · São Paulo - SP", ou "Local não informado". */
    public static String local(Context contexto, Vaga vaga) {
        List<String> partes = new ArrayList<>();
        if (Rotulos.de(vaga.modalidade) != 0) {
            partes.add(contexto.getString(Rotulos.de(vaga.modalidade)));
        }
        if (vaga.cidade != null) {
            partes.add(vaga.estado != null ? vaga.cidade + " - " + vaga.estado : vaga.cidade);
        }
        return partes.isEmpty() ? contexto.getString(R.string.vaga_local_nao_informado) : String.join(" · ", partes);
    }

    /** Selo informativo (não clicável): público da vaga, contrato, recursos, competências. */
    public static void adicionarSelo(ChipGroup grupo, String texto, boolean destaque) {
        Context contexto = grupo.getContext();
        Chip selo = new Chip(contexto);
        selo.setText(texto);
        selo.setClickable(false);
        selo.setFocusable(false);
        selo.setEnsureMinTouchTargetSize(false);
        selo.setChipBackgroundColorResource(destaque ? R.color.acesso_container_primaria : R.color.acesso_fundo_secundario);
        selo.setTextColor(contexto.getColor(destaque ? R.color.acesso_sobre_container_primaria : R.color.acesso_texto));
        selo.setChipStrokeWidth(0);
        grupo.addView(selo);
    }
}
