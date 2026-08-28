import { Op } from "sequelize";

import {
    Usuario,
    Candidato,
    Empresa,
    UsuarioSeguido,
    EmpresaSeguida,
    FavoritoVaga,
    Vaga,
    Curtida
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";

const PERFIL_PUBLICO = [
    "id",
    "nome",
    "fotoPerfil",
    "capaPerfil",
    "tipoUsuario"
];

const ATRIBUTOS_EMPRESA_SUGESTAO = [
    "id",
    "usuarioId",
    "nomeFantasia",
    "razaoSocial",
    "logo",
    "setor",
    "cidade",
    "empresaVerificada",
    "statusAprovacao"
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

        if (await BloqueioService.estaBloqueadoEntre(solicitante.id, seguidoId)) {
            throw ApiError.forbidden("Você não pode seguir este usuário.");
        }

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

        if (
            await BloqueioService.estaBloqueadoEntre(
                solicitante.id,
                empresa.usuarioId
            )
        ) {
            throw ApiError.forbidden("Você não pode seguir esta empresa.");
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

    /* ==========================================================
       DESCOBERTA — PESSOAS
       Sugestões explicáveis (cada resultado traz um `motivo` em texto
       simples) baseadas apenas em sinais não sensíveis: cidade, título/área
       profissional, interação pública no feed (curtidas em comum) e
       conexões em comum. NUNCA usa deficiência, diagnóstico ou qualquer
       dado de saúde como critério — esses campos nem são consultados aqui.
    ========================================================== */
    async sugestoesPessoas(solicitante, limite = 8) {
        const limiteFinal = Math.min(Number(limite) || 8, 20);

        const [jaSeguidos, idsBloqueio, meuCandidato] = await Promise.all([
            this.idsSeguidos(solicitante.id),
            BloqueioService.idsRelacionados(solicitante.id),
            Candidato.findOne({
                where: { usuarioId: solicitante.id },
                attributes: ["cidade", "tituloProfissional"]
            })
        ]);

        const excluidos = [...new Set([...jaSeguidos, ...idsBloqueio, solicitante.id])];
        const candidatosPontuados = new Map();

        const pontuar = (usuario, pontos, motivo) => {
            if (!usuario || excluidos.includes(usuario.id)) return;
            const atual = candidatosPontuados.get(usuario.id) ?? { usuario, pontos: 0, motivos: [] };
            atual.pontos += pontos;
            if (!atual.motivos.includes(motivo)) atual.motivos.push(motivo);
            candidatosPontuados.set(usuario.id, atual);
        };

        const filtroBase = {
            ativo: true,
            bloqueado: false,
            tipoUsuario: { [Op.ne]: "administrador" },
            id: { [Op.notIn]: excluidos }
        };

        if (meuCandidato?.cidade) {
            const mesmaCidade = await Usuario.findAll({
                where: filtroBase,
                attributes: PERFIL_PUBLICO,
                include: [
                    {
                        model: Candidato,
                        as: "candidato",
                        required: true,
                        where: { cidade: meuCandidato.cidade },
                        attributes: ["tituloProfissional", "cidade"]
                    }
                ],
                limit: 30
            });
            mesmaCidade.forEach((usuario) => pontuar(usuario, 3, `Também está em ${meuCandidato.cidade}`));
        }

        if (meuCandidato?.tituloProfissional) {
            const mesmaArea = await Usuario.findAll({
                where: filtroBase,
                attributes: PERFIL_PUBLICO,
                include: [
                    {
                        model: Candidato,
                        as: "candidato",
                        required: true,
                        where: { tituloProfissional: meuCandidato.tituloProfissional },
                        attributes: ["tituloProfissional", "cidade"]
                    }
                ],
                limit: 30
            });
            mesmaArea.forEach((usuario) => pontuar(usuario, 3, `Atua como ${meuCandidato.tituloProfissional}`));
        }

        // Interação pública em comum: curtiu as mesmas publicações que eu.
        const minhasCurtidas = await Curtida.findAll({
            where: { usuarioId: solicitante.id },
            attributes: ["postagemId"],
            limit: 50
        });
        const idsPostagensCurtidas = minhasCurtidas.map((c) => c.postagemId);
        if (idsPostagensCurtidas.length) {
            const outrasCurtidas = await Curtida.findAll({
                where: { postagemId: idsPostagensCurtidas, usuarioId: { [Op.notIn]: excluidos } },
                include: [
                    {
                        model: Usuario,
                        as: "usuario",
                        required: true,
                        attributes: PERFIL_PUBLICO,
                        where: { ativo: true, bloqueado: false, tipoUsuario: { [Op.ne]: "administrador" } }
                    }
                ],
                limit: 50
            });
            outrasCurtidas.forEach((curtida) =>
                pontuar(curtida.usuario, 2, "Interage com publicações parecidas com as suas")
            );
        }

        // Conexões em comum: seguido por quem eu já sigo.
        if (jaSeguidos.length) {
            const seguidosPorQuemSigo = await UsuarioSeguido.findAll({
                where: { seguidorId: jaSeguidos, seguidoId: { [Op.notIn]: excluidos } },
                include: [
                    {
                        model: Usuario,
                        as: "seguido",
                        required: true,
                        attributes: PERFIL_PUBLICO,
                        where: { ativo: true, bloqueado: false, tipoUsuario: { [Op.ne]: "administrador" } }
                    }
                ],
                limit: 50
            });
            seguidosPorQuemSigo.forEach((vinculo) =>
                pontuar(vinculo.seguido, 2, "Seguido por pessoas que você segue")
            );
        }

        let resultado = [...candidatosPontuados.values()].sort((a, b) => b.pontos - a.pontos);

        // Sem sinais suficientes: completa com perfis recentes (sem motivo enganoso de afinidade).
        if (resultado.length < limiteFinal) {
            const jaEncontrados = resultado.map((item) => item.usuario.id);
            const recentes = await Usuario.findAll({
                where: { ...filtroBase, id: { [Op.notIn]: [...excluidos, ...jaEncontrados] } },
                attributes: PERFIL_PUBLICO,
                include: [
                    { model: Candidato, as: "candidato", required: false, attributes: ["tituloProfissional"] },
                    { model: Empresa, as: "empresa", required: false, attributes: ["nomeFantasia"] }
                ],
                limit: limiteFinal - resultado.length,
                order: [["created_at", "DESC"]]
            });
            recentes.forEach((usuario) => pontuar(usuario, 0, "Novo no ACESSO"));
            resultado = [...candidatosPontuados.values()].sort((a, b) => b.pontos - a.pontos);
        }

        return resultado.slice(0, limiteFinal).map(({ usuario, motivos }) => ({
            id: usuario.id,
            nome: usuario.nome,
            fotoPerfil: usuario.fotoPerfil,
            tipo: usuario.tipoUsuario,
            titulo: usuario.candidato?.tituloProfissional ?? usuario.empresa?.nomeFantasia ?? null,
            motivo: motivos[0] ?? "Novo no ACESSO"
        }));
    }

    /** Mantido por compatibilidade — nunca foi consumido pelo frontend. */
    async sugestoes(solicitante, limite = 5) {
        return this.sugestoesPessoas(solicitante, limite);
    }

    /* ==========================================================
       DESCOBERTA — EMPRESAS
       Só faz sentido para candidatos (só eles seguem empresas). Critérios:
       empresas donas de vagas já favoritadas, mesmo setor de empresas de
       interesse e mesma cidade do candidato — nunca deficiência/diagnóstico.
    ========================================================== */
    async sugestoesEmpresas(solicitante, limite = 8) {
        const limiteFinal = Math.min(Number(limite) || 8, 20);

        const candidato = await Candidato.findOne({ where: { usuarioId: solicitante.id } });
        if (!candidato) return [];

        const [idsUsuariosBloqueio, seguidas, favoritas] = await Promise.all([
            BloqueioService.idsRelacionados(solicitante.id),
            EmpresaSeguida.findAll({ where: { candidatoId: candidato.id }, attributes: ["empresaId"] }),
            FavoritoVaga.findAll({
                where: { candidatoId: candidato.id },
                include: [{ model: Vaga, as: "vaga", attributes: ["empresaId"] }]
            })
        ]);

        const idsSeguidas = seguidas.map((vinculo) => vinculo.empresaId);
        const idsFavoritadas = [...new Set(favoritas.map((f) => f.vaga?.empresaId).filter(Boolean))];
        const excluidas = [...new Set(idsSeguidas)];

        const empresasPontuadas = new Map();
        const pontuar = (empresa, pontos, motivo) => {
            if (!empresa || excluidas.includes(empresa.id) || idsUsuariosBloqueio.includes(empresa.usuarioId)) return;
            const atual = empresasPontuadas.get(empresa.id) ?? { empresa, pontos: 0, motivos: [] };
            atual.pontos += pontos;
            if (!atual.motivos.includes(motivo)) atual.motivos.push(motivo);
            empresasPontuadas.set(empresa.id, atual);
        };

        if (idsFavoritadas.length) {
            const donasFavoritadas = await Empresa.findAll({
                where: { id: { [Op.in]: idsFavoritadas, [Op.notIn]: excluidas } },
                attributes: ATRIBUTOS_EMPRESA_SUGESTAO
            });
            donasFavoritadas.forEach((empresa) => pontuar(empresa, 4, "Você favoritou uma vaga desta empresa"));

            const empresasDeInteresse = await Empresa.findAll({
                where: { id: { [Op.in]: [...idsFavoritadas, ...idsSeguidas] } },
                attributes: ["setor"]
            });
            const setores = [...new Set(empresasDeInteresse.map((e) => e.setor).filter(Boolean))];
            if (setores.length) {
                const mesmoSetor = await Empresa.findAll({
                    where: { setor: { [Op.in]: setores }, id: { [Op.notIn]: [...excluidas, ...idsFavoritadas] } },
                    attributes: ATRIBUTOS_EMPRESA_SUGESTAO,
                    limit: 20
                });
                mesmoSetor.forEach((empresa) => pontuar(empresa, 2, `Também atua em ${empresa.setor}`));
            }
        }

        if (candidato.cidade) {
            const mesmaCidade = await Empresa.findAll({
                where: { cidade: candidato.cidade, id: { [Op.notIn]: excluidas } },
                attributes: ATRIBUTOS_EMPRESA_SUGESTAO,
                limit: 20
            });
            mesmaCidade.forEach((empresa) => pontuar(empresa, 1, `Está em ${candidato.cidade}`));
        }

        let resultado = [...empresasPontuadas.values()].sort((a, b) => b.pontos - a.pontos);

        if (resultado.length < limiteFinal) {
            const jaEncontradas = resultado.map((item) => item.empresa.id);
            const parceiras = await Empresa.findAll({
                where: {
                    id: { [Op.notIn]: [...excluidas, ...jaEncontradas] },
                    statusAprovacao: "aprovada"
                },
                attributes: ATRIBUTOS_EMPRESA_SUGESTAO,
                order: [
                    ["empresaVerificada", "DESC"],
                    ["created_at", "DESC"]
                ],
                limit: limiteFinal - resultado.length
            });
            parceiras.forEach((empresa) =>
                pontuar(empresa, 0, empresa.empresaVerificada ? "Empresa verificada no ACESSO" : "Empresa parceira do ACESSO")
            );
            resultado = [...empresasPontuadas.values()].sort((a, b) => b.pontos - a.pontos);
        }

        return resultado.slice(0, limiteFinal).map(({ empresa, motivos }) => ({
            id: empresa.id,
            usuarioId: empresa.usuarioId,
            nomeFantasia: empresa.nomeFantasia,
            razaoSocial: empresa.razaoSocial,
            logo: empresa.logo,
            setor: empresa.setor,
            empresaVerificada: empresa.empresaVerificada,
            motivo: motivos[0] ?? "Empresa parceira do ACESSO"
        }));
    }
}

export default new SeguidorService();
