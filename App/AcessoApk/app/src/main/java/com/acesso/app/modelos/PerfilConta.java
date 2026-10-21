package com.acesso.app.modelos;

import java.util.ArrayList;
import java.util.List;

/**
 * Perfil de uma conta como o servidor devolve: o próprio (aba Perfil) ou o de outra pessoa ou empresa.
 * Pessoa: GET /api/perfil/candidatos/usuario/:usuarioId (já filtrado pela allowlist de privacidade da API).
 * Empresa: GET /api/empresas/me ou GET /api/empresas/usuario/:usuarioId.
 * CPF, CNPJ, endereço, CEP, currículo e necessidades de acessibilidade não são lidos.
 */
public class PerfilConta {

    /** Linha de experiência ou de formação. */
    public static class ItemCurriculo {
        /** Cargo ou curso. */
        public String titulo;
        /** Empresa ou instituição. */
        public String subtitulo;
        /** Ex.: "mar/2020 – atual". */
        public String periodo;
        public String descricao;
    }

    public String usuarioId;
    public TipoConta tipoConta;
    /** Nome para exibir: o da pessoa, ou o nome fantasia (ou razão social) da empresa. */
    public String nome;
    /** Pessoa: "Título profissional · Cidade - UF". Empresa: setor e local. Pode ser nulo. */
    public String detalhe;
    /** Empresa: statusAprovacao (pendente, aprovada...). Pessoa: nulo. */
    public String statusEmpresa;
    public boolean empresaVerificada;

    /** Id do registro de candidato ou de empresa: as rotas de edição usam este, não o id da conta. */
    public String registroId;
    /** Pessoa: foto e capa da conta. Empresa: logo e capa da empresa. Podem ser nulas. */
    public String fotoUrl;
    public String capaUrl;

    // Valores soltos (sem juntar), para preencher o formulário de edição.
    /** Pessoa: nome da conta. Empresa: nome fantasia (nulo se não tem). */
    public String nomeEditavel;
    public String tituloProfissional;
    public String setor;
    public String cidade;
    public String estado;

    /** Pessoa: biografia. Empresa: descrição. */
    public String sobre;
    /** Só empresa. */
    public String culturaInclusiva;
    public String site;
    public String porte;

    public List<String> habilidades = new ArrayList<>();
    public List<ItemCurriculo> experiencias = new ArrayList<>();
    public List<ItemCurriculo> formacoes = new ArrayList<>();
    /** Só empresa: vagas abertas. */
    public List<Vaga> vagasAbertas = new ArrayList<>();
}
