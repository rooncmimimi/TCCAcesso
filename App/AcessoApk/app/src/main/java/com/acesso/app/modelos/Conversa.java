package com.acesso.app.modelos;

/**
 * Conversa privada entre a conta logada e outra conta (tabela conversas, GET /api/conversas).
 * Guarda só o lado "outro": quem está logado é sempre o outro participante.
 */
public class Conversa {

    public String id;
    /** Nulo quando a outra conta foi excluída: o histórico fica, mas não aceita mensagem nova. */
    public String outroUsuarioId;
    public String nomeOutro;
    public TipoConta tipoOutro;
    /** Última mensagem (até 180 caracteres), ou nulo se a conversa acabou de ser aberta. */
    public String previa;
    public String quando;
    public int naoLidas;

    public boolean outroRemovido() {
        return outroUsuarioId == null;
    }
}
