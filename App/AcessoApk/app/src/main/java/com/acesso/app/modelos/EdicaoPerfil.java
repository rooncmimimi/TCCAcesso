package com.acesso.app.modelos;

/**
 * Campos que o app deixa editar no perfil. Pessoa: nome (conta) e título, biografia, cidade e estado
 * (candidato). Empresa: nome fantasia, setor, descrição, cultura inclusiva, site, cidade e estado.
 * Os ids vêm do perfil carregado: o candidato ou a empresa são alterados pelo id do registro, não da conta.
 */
public class EdicaoPerfil {

    public String usuarioId;
    /** Id do registro de candidato ou de empresa. */
    public String registroId;
    public TipoConta tipoConta;

    /** Pessoa: nome da conta. Empresa: nome fantasia. */
    public String nome;
    public String tituloProfissional;
    /** Pessoa: biografia. Empresa: descrição. */
    public String sobre;
    public String culturaInclusiva;
    public String setor;
    public String site;
    public String cidade;
    /** Sigla com duas letras (ex.: SP). */
    public String estado;
}
