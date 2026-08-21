import { Op } from "sequelize";

import {
    Usuario,
    Candidato,
    Empresa,
    UsuarioSeguido,
    EmpresaSeguida
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import NotificacaoService from "./NotificacaoService.js";

const PERFIL_PUBLICO = [
    "id",
    "nome",
    "fotoPerfil",
    "capaPerfil",
    "tipoUsuario"
];

/**
 * Rede de conexões: seguir usuários e empresas.
 *
 * O seguidor é SEMPRE o usuário autenticado — nunca vem do corpo da
 * requisição (proteção contra IDOR / OWASP A01).
 */
class SeguidorService {
    async garantirUsuarioAtivo(usuarioId) {
        const usuario = await Usuario.findByPk(usuarioId, {
            attributes: [...PERFIL_PUBLICO, "ativo", "bloqueado"]
        });

        if (!usuario || !usuario.ativo || usuario.bloqueado) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        return usuario;
    }

    /* ==========================================================
       SEGUIR / DEIXAR DE SEGUIR USUÁRIO
    ========================================================== */
    async alternarUsuario(seguidoId, solicitante) {
        if (String(seguidoId) === String(solicitante.id)) {
            throw ApiError.badRequest("Você não pode seguir a si mesmo.");
        }

        const seguido = await this.garantirUsuarioAtivo(seguidoId);

        const existente = await UsuarioSeguido.findOne({
            where: { seguidorId: solicitante.id, seguidoId }
        });

        if (existente) {
            await existente.destroy();

            return {
                seguindo: false,
                totalSeguidores: await UsuarioSeguido.count({
                    where: { seguidoId }
                })
            };
        }

        await UsuarioSeguido.create({
            seguidorId: solicitante.id,
            seguidoId
        });

        await NotificacaoService.criar({
            usuarioId: seguido.id,
            tipo: "Sistema",
            titulo: "Você tem um novo seguidor",
            descricao: `${solicitante.nome} começou a seguir você.`
        });

        return {
            seguindo: true,
            totalSeguidores: await UsuarioSeguido.count({ where: { seguidoId } })
        };
    }

    /* ==========================================================
       SEGUIR / DEIXAR DE SEGUIR EMPRESA
    ========================================================== */
    async alternarEmpresa(empresaId, solicitante) {
        const empresa = await Empresa.findByPk(empresaId);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        const candidato = await Candidato.findOne({
            where: { usuarioId: solicitante.id }
        });

        if (!candidato) {
            throw ApiError.forbidden(
                "Apenas candidatos podem seguir empresas."
            );
        }

        const existente = await EmpresaSeguida.findOne({
            where: { candidatoId: candidato.id, empresaId }
        });

        if (existente) {
            await existente.destroy();

            return {
                seguindo: false,
                totalSeguidores: await EmpresaSeguida.count({
                    where: { empresaId }
                })
            };
        }

        await EmpresaSeguida.create({
            candidatoId: candidato.id,
            empresaId
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "Sistema",
            titulo: "Novo seguidor",
            descricao: `${solicitante.nome} começou a seguir sua empresa.`
        });

        return {
            seguindo: true,
            totalSeguidores: await EmpresaSeguida.count({ where: { empresaId } })
        };
    }

    /* ==========================================================
       LISTAGENS
    ========================================================== */
    async listarSeguidores(usuarioId, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await UsuarioSeguido.findAndCountAll({
            where: { seguidoId: usuarioId },
            include: [
                {
                    model: Usuario,
                    as: "seguidor",
                    attributes: PERFIL_PUBLICO
                }
            ],
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta(
            "seguidores",
            rows.map((item) => item.seguidor),
            count,
            pagina,
            limite
        );
    }

    async listarSeguindo(usuarioId, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await UsuarioSeguido.findAndCountAll({
            where: { seguidorId: usuarioId },
            include: [
                {
                    model: Usuario,
                    as: "seguido",
                    attributes: PERFIL_PUBLICO
                }
            ],
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta(
            "seguindo",
            rows.map((item) => item.seguido),
            count,
            pagina,
            limite
        );
    }

    /** Contadores + estado do usuário autenticado em relação ao perfil. */
    async resumo(usuarioId, solicitante) {
        const [seguidores, seguindo, relacao] = await Promise.all([
            UsuarioSeguido.count({ where: { seguidoId: usuarioId } }),
            UsuarioSeguido.count({ where: { seguidorId: usuarioId } }),
            solicitante
                ? UsuarioSeguido.findOne({
                      where: {
                          seguidorId: solicitante.id,
                          seguidoId: usuarioId
                      }
                  })
                : null
        ]);

        return {
            totalSeguidores: seguidores,
            totalSeguindo: seguindo,
            seguindoEsteUsuario: Boolean(relacao)
        };
    }

    /** Contadores + estado do candidato autenticado em relação a uma empresa. */
    async resumoEmpresa(empresaId, solicitante) {
        const empresa = await Empresa.findByPk(empresaId, {
            attributes: ["id"]
        });

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        let candidato = null;

        if (solicitante) {
            candidato = await Candidato.findOne({
                where: { usuarioId: solicitante.id }
            });
        }

        const [totalSeguidores, relacao] = await Promise.all([
            EmpresaSeguida.count({ where: { empresaId } }),
            candidato
                ? EmpresaSeguida.findOne({
                      where: { empresaId, candidatoId: candidato.id }
                  })
                : null
        ]);

        return {
            totalSeguidores,
            seguindoEstaEmpresa: Boolean(relacao)
        };
    }

    /** IDs seguidos pelo usuário — usado para priorizar o feed. */
    async idsSeguidos(usuarioId) {
        const vinculos = await UsuarioSeguido.findAll({
            where: { seguidorId: usuarioId },
            attributes: ["seguidoId"]
        });

        return vinculos.map((item) => item.seguidoId);
    }

    async sugestoes(solicitante, limite = 5) {
        const jaSeguidos = await this.idsSeguidos(solicitante.id);

        return Usuario.findAll({
            where: {
                ativo: true,
                bloqueado: false,
                tipoUsuario: { [Op.ne]: "administrador" },
                id: { [Op.notIn]: [...jaSeguidos, solicitante.id] }
            },
            attributes: PERFIL_PUBLICO,
            include: [
                {
                    model: Candidato,
                    as: "candidato",
                    required: false,
                    attributes: ["tituloProfissional", "cidade", "estado"]
                },
                {
                    model: Empresa,
                    as: "empresa",
                    required: false,
                    attributes: ["nomeFantasia", "setor", "logo"]
                }
            ],
            limit: Math.min(Number(limite) || 5, 20),
            order: [["created_at", "DESC"]]
        });
    }
}

export default new SeguidorService();
