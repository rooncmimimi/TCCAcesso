package com.acesso.app.modelos;

/**
 * Relação de quem está logado com um perfil: contadores e se já segue. Pessoa: GET /api/seguir/resumo/:usuarioId.
 * Empresa: GET /api/seguir/resumo/empresas/:empresaId (a API só deixa candidatos seguirem empresas).
 */
public class ResumoSeguidores {

    public int totalSeguidores;
    /** Só para pessoa; a empresa não tem "seguindo". */
    public int totalSeguindo;
    public boolean seguindo;
    /** Perfil privado: seguir exige uma solicitação aceita pela pessoa. */
    public boolean perfilPrivado;
    public boolean solicitacaoPendente;
    public boolean bloqueado;
}
