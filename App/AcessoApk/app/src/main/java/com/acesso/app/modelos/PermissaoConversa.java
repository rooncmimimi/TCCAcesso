package com.acesso.app.modelos;

/**
 * Resposta de GET /api/conversas/pode-iniciar/:usuarioId: decide o estado do botão "Mensagem" antes
 * do toque (preferência de mensagens do destinatário, bloqueios). Quem decide de verdade é a API,
 * de novo, ao abrir a conversa.
 */
public class PermissaoConversa {

    public boolean permitido;
    /** Motivo da recusa, já em português, vindo da API. */
    public String motivo;
}
