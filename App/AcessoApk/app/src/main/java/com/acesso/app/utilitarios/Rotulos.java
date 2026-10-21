package com.acesso.app.utilitarios;

import androidx.annotation.StringRes;

import com.acesso.app.R;

import java.util.Locale;

/**
 * Textos de tela para os valores que a API usa (ex.: "jovem_aprendiz" -> "Jovem aprendiz"),
 * como o constantesVaga.ts do site. As listas *_VALORES seguem a ordem do site.
 */
public final class Rotulos {

    public static final String[] MODALIDADES = {"presencial", "hibrido", "remoto"};
    public static final String[] CONTRATOS = {"clt", "pj", "estagio", "jovem_aprendiz", "temporario"};
    public static final String[] PUBLICOS = {"geral", "pcd", "cinquenta_mais", "pcd_cinquenta_mais"};
    public static final String[] PORTES = {"mei", "micro", "pequena", "media", "grande"};
    public static final String[] RECURSOS = {
            "interprete_libras", "tecnologia_assistiva", "ambiente_fisico_acessivel", "banheiro_adaptado",
            "elevador_rampa", "jornada_adaptavel", "ferramentas_digitais_acessiveis", "outro"};

    private Rotulos() {
    }

    @StringRes
    public static int de(String valor) {
        if (valor == null) {
            return 0;
        }
        switch (valor) {
            case "presencial": return R.string.modalidade_presencial;
            case "hibrido": return R.string.modalidade_hibrido;
            case "remoto": return R.string.modalidade_remoto;
            case "clt": return R.string.contrato_clt;
            case "pj": return R.string.contrato_pj;
            case "estagio": return R.string.contrato_estagio;
            case "jovem_aprendiz": return R.string.contrato_jovem_aprendiz;
            case "temporario": return R.string.contrato_temporario;
            case "geral": return R.string.publico_geral;
            case "pcd": return R.string.publico_pcd;
            case "cinquenta_mais": return R.string.publico_cinquenta_mais;
            case "pcd_cinquenta_mais": return R.string.publico_pcd_cinquenta_mais;
            case "mei": return R.string.porte_mei;
            case "micro": return R.string.porte_micro;
            case "pequena": return R.string.porte_pequena;
            case "media": return R.string.porte_media;
            case "grande": return R.string.porte_grande;
            case "interprete_libras": return R.string.recurso_interprete_libras;
            case "tecnologia_assistiva": return R.string.recurso_tecnologia_assistiva;
            case "ambiente_fisico_acessivel": return R.string.recurso_ambiente_fisico_acessivel;
            case "banheiro_adaptado": return R.string.recurso_banheiro_adaptado;
            case "elevador_rampa": return R.string.recurso_elevador_rampa;
            case "jornada_adaptavel": return R.string.recurso_jornada_adaptavel;
            case "ferramentas_digitais_acessiveis": return R.string.recurso_ferramentas_digitais_acessiveis;
            case "outro": return R.string.recurso_outro;
            case "aprovada": return R.string.status_aprovada;
            case "pendente": return R.string.status_pendente;
            case "reprovada": return R.string.status_reprovada;
            case "suspensa": return R.string.status_suspensa;
            default: return 0;
        }
    }

    /**
     * Situação de uma candidatura (STATUS_CANDIDATURA do backend). Separado de {@link #de}, porque
     * "aprovada" e "pendente" também são situações de empresa, com outro texto.
     */
    @StringRes
    public static int statusCandidatura(String valor) {
        if (valor == null) {
            return 0;
        }
        switch (valor) {
            case "pendente": return R.string.status_candidatura_pendente;
            case "visualizada": return R.string.status_candidatura_visualizada;
            case "em_analise": return R.string.status_candidatura_em_analise;
            case "aprovada": return R.string.status_candidatura_aprovada;
            case "rejeitada": return R.string.status_candidatura_rejeitada;
            case "cancelada": return R.string.status_candidatura_cancelada;
            default: return 0;
        }
    }

    /** Situação de uma vaga: aberta, pausada ou encerrada. */
    @StringRes
    public static int statusVaga(String valor) {
        if ("aberta".equals(valor)) return R.string.status_vaga_aberta;
        if ("pausada".equals(valor)) return R.string.status_vaga_pausada;
        if ("encerrada".equals(valor)) return R.string.status_vaga_encerrada;
        return 0;
    }

    /** Número do selo de não lidas: "1" a "99", depois "99+". */
    public static String contador(int total) {
        return total > 99 ? "99+" : String.valueOf(total);
    }

    /** Iniciais para o avatar sem foto: "Joana Exemplo" -> "JE" (como iniciaisDoNome do site). */
    public static String iniciais(String nome) {
        if (nome == null || nome.trim().isEmpty()) {
            return "?";
        }
        String[] partes = nome.trim().split("\\s+");
        String primeira = partes[0].substring(0, 1);
        String ultima = partes.length > 1 ? partes[partes.length - 1].substring(0, 1) : "";
        return (primeira + ultima).toUpperCase(Locale.ROOT);
    }

    /** Primeiro nome, para a saudação. */
    public static String primeiroNome(String nome) {
        if (nome == null || nome.trim().isEmpty()) {
            return null;
        }
        return nome.trim().split("\\s+")[0];
    }
}
