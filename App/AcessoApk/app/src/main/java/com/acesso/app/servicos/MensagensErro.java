package com.acesso.app.servicos;

/** Mensagens de falha comuns a qualquer servidor (Supabase ou API do Site). */
public final class MensagensErro {

    public static final String SEM_INTERNET =
            "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    public static final String SERVIDOR_INACESSIVEL =
            "Não foi possível falar com o servidor. Tente novamente em instantes.";
    public static final String ERRO_GENERICO =
            "Algo deu errado. Tente novamente.";
    public static final String SESSAO_EXPIRADA =
            "Sua sessão expirou. Entre novamente.";
    public static final String MUITAS_TENTATIVAS =
            "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
    public static final String SERVICO_INDISPONIVEL =
            "O serviço está indisponível no momento. Tente novamente mais tarde.";

    private MensagensErro() {
    }
}
