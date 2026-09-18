import {
    CandidatoExperiencia,
    CandidatoFormacao,
    CandidatoCertificado,
    CandidatoHabilidade,
    Candidato,
    Usuario,
    Deficiencia
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import {
    obterCandidatoDoUsuario,
    ehAdministrador
} from "../utils/autorizacao.js";
import {
    podeVerDadosPrivados,
    aplicarPrivacidadeCandidato
} from "../utils/candidatoPrivacidade.js";
import BloqueioService from "./BloqueioService.js";

/**
 * Perfil profissional detalhado do candidato: experiências, formações, certificados e habilidades.
 *
 * Criar, editar e excluir são sempre escopados ao candidato autenticado (proteção contra IDOR,
 * OWASP A01). O perfil consolidado pode ser lido por outras pessoas, respeitando bloqueios e com os
 * dados privados filtrados por `candidatoPrivacidade.js`.
 */

const RECURSOS = {
    experiencias: {
        model: CandidatoExperiencia,
        campos: [
            "cargo",
            "empresa",
            "local",
            "modalidade",
            "dataInicio",
            "dataFim",
            "atual",
            "descricao"
        ],
        ordem: [
            ["atual", "DESC"],
            ["data_inicio", "DESC"]
        ]
    },
    formacoes: {
        model: CandidatoFormacao,
        campos: [
            "instituicao",
            "curso",
            "nivel",
            "dataInicio",
            "dataFim",
            "emAndamento",
            "descricao"
        ],
        ordem: [
            ["em_andamento", "DESC"],
            ["data_inicio", "DESC"]
        ]
    },
    certificados: {
        model: CandidatoCertificado,
        campos: [
            "titulo",
            "instituicao",
            "emitidoEm",
            "expiraEm",
            "credencialUrl",
            "arquivo"
        ],
        ordem: [["emitido_em", "DESC"]]
    },
    habilidades: {
        model: CandidatoHabilidade,
        campos: ["nome", "nivel"],
        ordem: [["nome", "ASC"]]
    }
};

class PerfilCandidatoService {
    resolverRecurso(nome) {
        const recurso = RECURSOS[nome];

        if (!recurso) {
            throw ErroApi.naoEncontrado("Recurso de perfil inválido.");
        }

        return recurso;
    }

    filtrarCampos(recurso, data) {
        return recurso.campos.reduce((acumulado, campo) => {
            if (data[campo] !== undefined) {
                acumulado[campo] = data[campo] === "" ? null : data[campo];
            }

            return acumulado;
        }, {});
    }

    /** Perfil público/consolidado de um candidato. */
    async perfilCompleto(candidatoId, solicitante) {
        const candidato = await Candidato.findByPk(candidatoId, {
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: [
                        "id",
                        "nome",
                        "email",
                        "fotoPerfil",
                        "capaPerfil",
                        "tipoUsuario",
                        "perfilPublico"
                    ]
                },
                { model: CandidatoExperiencia, as: "experiencias" },
                { model: CandidatoFormacao, as: "formacoes" },
                { model: CandidatoCertificado, as: "certificados" },
                { model: CandidatoHabilidade, as: "habilidades" },
                {
                    model: Deficiencia,
                    as: "deficiencias",
                    through: { attributes: ["observacoes"] }
                }
            ]
        });

        if (!candidato) {
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        await BloqueioService.garantirNaoBloqueado(
            candidato.usuario,
            solicitante
        );

        // Aplica a mesma allowlist de `CandidatoService.buscarPorId`; sem ela, qualquer usuário
        // autenticado receberia o candidato inteiro (CPF, currículo, endereço, necessidades de
        // acessibilidade).
        const autorizado = await podeVerDadosPrivados(candidato, solicitante);

        return aplicarPrivacidadeCandidato(candidato, autorizado);
    }

    /**
     * Mesmo perfil público/consolidado, mas resolvido a partir do `usuarioId`
     * do autor de uma postagem/comentário: é o que permite "clicar na foto/nome
     * no feed" sem o cliente precisar conhecer o `candidatoId` de antemão.
     */
    async perfilCompletoPorUsuario(usuarioId, solicitante) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        return this.perfilCompleto(candidato.id, solicitante);
    }

    async listar(nome, candidatoId) {
        const recurso = this.resolverRecurso(nome);

        return recurso.model.findAll({
            where: { candidatoId },
            order: recurso.ordem
        });
    }

    async listarDoUsuario(nome, solicitante) {
        const candidato = await obterCandidatoDoUsuario(solicitante);

        return this.listar(nome, candidato.id);
    }

    async criar(nome, data, solicitante) {
        const recurso = this.resolverRecurso(nome);
        const candidato = await obterCandidatoDoUsuario(solicitante);

        return recurso.model.create({
            candidatoId: candidato.id,
            ...this.filtrarCampos(recurso, data)
        });
    }

    async buscarProprio(recurso, id, solicitante) {
        const registro = await recurso.model.findByPk(id);

        if (!registro) {
            throw ErroApi.naoEncontrado("Registro não encontrado.");
        }

        if (!ehAdministrador(solicitante)) {
            const candidato = await obterCandidatoDoUsuario(solicitante);

            if (String(registro.candidatoId) !== String(candidato.id)) {
                throw ErroApi.acessoNegado(
                    "Você não possui permissão sobre este registro."
                );
            }
        }

        return registro;
    }

    async atualizar(nome, id, data, solicitante) {
        const recurso = this.resolverRecurso(nome);
        const registro = await this.buscarProprio(recurso, id, solicitante);

        await registro.update(this.filtrarCampos(recurso, data));

        return registro;
    }

    async remover(nome, id, solicitante) {
        const recurso = this.resolverRecurso(nome);
        const registro = await this.buscarProprio(recurso, id, solicitante);

        await registro.destroy();

        return { mensagem: "Registro removido com sucesso." };
    }
}

export default new PerfilCandidatoService();
