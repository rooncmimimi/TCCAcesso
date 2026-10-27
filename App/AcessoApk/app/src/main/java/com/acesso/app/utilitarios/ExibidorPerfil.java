package com.acesso.app.utilitarios;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;

import com.acesso.app.R;
import com.acesso.app.databinding.ComponenteCabecalhoPerfilBinding;
import com.acesso.app.databinding.ComponenteSecoesPerfilBinding;
import com.acesso.app.databinding.ItemVagaBinding;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.modelos.Vaga;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

/**
 * Monta o perfil (o próprio, na aba Perfil, e o de outras contas, na TelaPerfilUsuario) com os mesmos
 * componentes: cabeçalho com capa e avatar, e as seções profissionais em cartões.
 */
public final class ExibidorPerfil {

    private ExibidorPerfil() {
    }

    /**
     * @param email      só no próprio perfil; nulo esconde a linha.
     * @param statusEmpresa valor da API (pendente, aprovada...); só aparece para empresa.
     */
    public static void cabecalho(ComponenteCabecalhoPerfilBinding cabecalho, String nome, String detalhe,
                                 String email, TipoConta tipo, String statusEmpresa) {
        Context contexto = cabecalho.getRoot().getContext();
        cabecalho.textoIniciais.setText(Rotulos.iniciais(nome));
        cabecalho.textoNome.setText(nome);
        ExibidorSecoes.mostrar(cabecalho.textoDetalhe, detalhe);
        ExibidorSecoes.mostrar(cabecalho.textoEmail, email);
        cabecalho.textoTipoConta.setText(tipo == TipoConta.EMPRESA ? R.string.tipo_conta_empresa : R.string.tipo_conta_pessoa);
        int status = Rotulos.de(statusEmpresa);
        if (tipo == TipoConta.EMPRESA && status != 0) {
            cabecalho.textoStatusEmpresa.setText(contexto.getString(R.string.perfil_status_empresa, contexto.getString(status)));
            cabecalho.textoStatusEmpresa.setVisibility(View.VISIBLE);
        } else {
            cabecalho.textoStatusEmpresa.setVisibility(View.GONE);
        }
        // O TalkBack lê o cabeçalho de uma vez: "Nome, título, e-mail, tipo de conta, situação".
        List<CharSequence> partes = new ArrayList<>(Arrays.asList(nome, detalhe, email,
                cabecalho.textoTipoConta.getText()));
        if (cabecalho.textoStatusEmpresa.getVisibility() == View.VISIBLE) {
            partes.add(cabecalho.textoStatusEmpresa.getText());
        }
        StringBuilder descricao = new StringBuilder();
        for (CharSequence parte : partes) {
            if (parte != null && parte.length() > 0) {
                descricao.append(descricao.length() > 0 ? ", " : "").append(parte);
            }
        }
        cabecalho.cabecalhoPerfil.setContentDescription(descricao);
    }

    /** Foto (ou logo) e capa do perfil sobre as iniciais e o raio, quando existem. */
    public static void imagens(ComponenteCabecalhoPerfilBinding cabecalho, String fotoUrl, String capaUrl) {
        Context contexto = cabecalho.getRoot().getContext();
        float densidade = contexto.getResources().getDisplayMetrics().density;
        ExibidorImagem.avatar(cabecalho.imagemAvatar, fotoUrl, (int) (96 * densidade));
        ExibidorImagem.capa(cabecalho.imagemCapa, capaUrl, contexto.getResources().getDisplayMetrics().widthPixels);
    }

    /**
     * "12 seguidores · 7 seguindo" (empresa: só seguidores). Entra também na descrição lida pelo leitor de tela.
     * {@code resumo} nulo esconde a linha.
     */
    public static void seguidores(ComponenteCabecalhoPerfilBinding cabecalho, ResumoSeguidores resumo, boolean empresa) {
        Context contexto = cabecalho.getRoot().getContext();
        CharSequence anterior = cabecalho.textoSeguidores.getText();
        CharSequence descricao = cabecalho.cabecalhoPerfil.getContentDescription();
        if (descricao != null && anterior != null && anterior.length() > 0) {
            String sufixo = ", " + anterior;
            if (descricao.toString().endsWith(sufixo)) {
                descricao = descricao.subSequence(0, descricao.length() - sufixo.length());
            }
        }
        if (resumo == null) {
            cabecalho.textoSeguidores.setVisibility(View.GONE);
            cabecalho.textoSeguidores.setText(null);
            cabecalho.cabecalhoPerfil.setContentDescription(descricao);
            return;
        }
        String texto = empresa
                ? contexto.getResources().getQuantityString(R.plurals.perfil_seguidores, resumo.totalSeguidores, resumo.totalSeguidores)
                : contexto.getString(R.string.perfil_seguidores_seguindo,
                        contexto.getResources().getQuantityString(R.plurals.perfil_seguidores, resumo.totalSeguidores, resumo.totalSeguidores),
                        resumo.totalSeguindo);
        cabecalho.textoSeguidores.setText(texto);
        cabecalho.textoSeguidores.setVisibility(View.VISIBLE);
        cabecalho.cabecalhoPerfil.setContentDescription((descricao == null ? "" : descricao + ", ") + texto);
    }

    /**
     * Pessoa: Sobre, Competências, Experiência, Formação. Empresa: Sobre, Cultura inclusiva, Informações e
     * Vagas abertas (toque abre a vaga). Sem nenhuma informação, mostra um aviso no lugar.
     */
    public static void secoes(ComponenteSecoesPerfilBinding secoes, PerfilConta perfil, boolean proprio,
                              LayoutInflater inflador, Consumer<Vaga> abrirVaga) {
        Context contexto = secoes.getRoot().getContext();
        boolean empresa = perfil.tipoConta == TipoConta.EMPRESA;
        boolean algo = ExibidorSecoes.texto(secoes.secaoSobre, R.string.perfil_secao_sobre, perfil.sobre);
        if (empresa) {
            algo |= ExibidorSecoes.texto(secoes.secaoCultura, R.string.perfil_secao_cultura, perfil.culturaInclusiva);
            List<String> informacoes = new ArrayList<>();
            if (Rotulos.de(perfil.porte) != 0) {
                informacoes.add(contexto.getString(R.string.perfil_porte, contexto.getString(Rotulos.de(perfil.porte))));
            }
            if (ExibidorSecoes.temTexto(perfil.site)) {
                informacoes.add(contexto.getString(R.string.perfil_site, perfil.site.trim()));
            }
            algo |= ExibidorSecoes.linhas(secoes.secaoInformacoes, R.string.perfil_secao_informacoes, informacoes);
            List<View> cartoes = new ArrayList<>();
            for (Vaga vaga : perfil.vagasAbertas) {
                ItemVagaBinding item = ItemVagaBinding.inflate(inflador, secoes.secaoVagas.listaSecao, false);
                CartaoVaga.preencher(item, vaga, false);
                item.conteudoItem.setOnClickListener(v -> abrirVaga.accept(vaga));
                cartoes.add(item.getRoot());
            }
            ExibidorSecoes.lista(secoes.secaoVagas, R.string.perfil_secao_vagas_abertas, cartoes);
            algo |= !cartoes.isEmpty();
            secoes.secaoCompetencias.getRoot().setVisibility(View.GONE);
            secoes.secaoExperiencia.getRoot().setVisibility(View.GONE);
            secoes.secaoFormacao.getRoot().setVisibility(View.GONE);
        } else {
            algo |= ExibidorSecoes.selos(secoes.secaoCompetencias, R.string.perfil_secao_competencias, perfil.habilidades);
            algo |= ExibidorSecoes.curriculo(secoes.secaoExperiencia, R.string.perfil_secao_experiencia,
                    perfil.experiencias, inflador);
            algo |= ExibidorSecoes.curriculo(secoes.secaoFormacao, R.string.perfil_secao_formacao,
                    perfil.formacoes, inflador);
            secoes.secaoCultura.getRoot().setVisibility(View.GONE);
            secoes.secaoInformacoes.getRoot().setVisibility(View.GONE);
            secoes.secaoVagas.getRoot().setVisibility(View.GONE);
        }
        secoes.textoSemInformacoes.setText(proprio ? R.string.perfil_proprio_sem_informacoes : R.string.perfil_sem_informacoes);
        secoes.textoSemInformacoes.setVisibility(algo ? View.GONE : View.VISIBLE);
    }
}
