package com.acesso.app.modelos;

/** Notificação da conta logada (tabela notificacoes, GET /api/notificacoes). */
public class Notificacao {

    public String id;
    /** sistema, mensagem, vaga, candidatura, feed ou moderacao. */
    public String tipo;
    /** Ex.: mensagem_nova, candidatura_recebida. Decide o destino do toque. */
    public String subtipo;
    public String titulo;
    public String descricao;
    public boolean lida;
    public String quando;
    /** Sobre o que é a notificação (conversa, vaga, postagem...). Pode ser nulo. */
    public String entidadeTipo;
    public String entidadeId;
    /** Quem praticou a ação; nulo se a conta foi excluída ou é aviso do sistema. */
    public String atorId;
    public String atorNome;
}
