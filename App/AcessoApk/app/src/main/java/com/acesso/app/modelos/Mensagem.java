package com.acesso.app.modelos;

/** Mensagem de uma conversa (tabela mensagens, GET /api/conversas/:id/mensagens). */
public class Mensagem {

    public String id;
    /** Nulo quando quem enviou excluiu a conta. */
    public String remetenteId;
    public String conteudo;
    public boolean lida;
    /** Momento do envio em milissegundos (0 se a API não informou). */
    public long enviadaEm;
}
