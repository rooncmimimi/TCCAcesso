import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Vaga, Empresa, Usuario, Candidatura } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, garantirEmpresaAprovada } from "../utils/authorization.js";

const CAMPOS_EDITAVEIS = [
    "titulo",
    "descricao",
    "requisitos",
    "beneficios",
    "salario",
    "modalidade",
    "contrato",
    "cidade",
    "estado",
    "cargaHoraria",
    "exclusivaPcd",
    "acessibilidade",
    "status",
    "dataEncerramento"
];

class VagaService {
    filtrarCampos(data) {
        return CAMPOS_EDITAVEIS.reduce((acc, campo) => {
            if (data[campo] !== undefined) {
                acc[campo] = data[campo];
            }
            return acc;
        }, {});
    }

    /**
     * Retorna a empresa do usuário autenticado e garante que ela existe.
     */
    async empresaDoUsuario(usuarioId) {
        const empresa = await Empresa.findOne({ where: { usuarioId } });

        if (!empresa) {
            throw ApiError.forbidden(
                "Apenas empresas com perfil completo podem gerenciar vagas."
            );
        }

        return empresa;
    }

    async buscarVagaComEmpresa(id, transaction) {
        const vaga = await Vaga.findByPk(id, {
            include: [{ model: Empresa, as: "empresa" }],
            transaction
        });

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
        }

        return vaga;
    }

    /* ==========================================================
       LISTAR (público) — apenas vagas abertas por padrão
    ========================================================== */
    async findAll(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);
        const {
            search,
            cidade,
            estado,
            modalidade,
            contrato,
            exclusivaPcd,
            empresaId,
            status
        } = query;

        const where = {
            status: status || "Aberta"
        };

        if (empresaId) {
            where.empresaId = empresaId;
        }

        if (cidade) {
            where.cidade = { [Op.iLike]: `%${cidade}%` };
        }

        if (estado) {
            where.estado = estado.toUpperCase();
        }

        if (modalidade) {
            where.modalidade = modalidade;
        }

        if (contrato) {
            where.contrato = contrato;
        }

        if (exclusivaPcd !== undefined) {
            where.exclusivaPcd = exclusivaPcd === "true" || exclusivaPcd === true;
        }

        if (search) {
            where[Op.or] = [
                { titulo: { [Op.iLike]: `%${search}%` } },
                { descricao: { [Op.iLike]: `%${search}%` } },
                { requisitos: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Vaga.findAndCountAll({
            where,
            include: [
                {
                    model: Empresa,
                    as: "empresa",
                    attributes: [
                        "id",
                        "nomeFantasia",
                        "razaoSocial",
                        "logo",
                        "cidade",
                        "estado",
                        "empresaVerificada"
                    ]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["data_publicacao", "DESC"]]
        });

        return montarResposta("vagas", rows, count, pagina, limite);
    }

    /* ==========================================================
       BUSCAR POR ID (público)
    ========================================================== */
    async findById(id) {
        const vaga = await Vaga.findByPk(id, {
            include: [
                {
                    model: Empresa,
                    as: "empresa",
                    include: [
                        {
                            model: Usuario,
                            as: "usuario",
                            attributes: ["id", "nome", "fotoPerfil"]
                        }
                    ]
                }
            ]
        });

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
        }

        return vaga;
    }

    /* ==========================================================
       VAGAS DA EMPRESA AUTENTICADA
       Inclui `totalCandidaturas` por vaga (uma única consulta agregada,
       não N+1) — usado pelo painel de gestão para mostrar quantas
       candidaturas cada vaga recebeu sem precisar de outra chamada.
    ========================================================== */
    async findByEmpresaAutenticada(usuarioId, query) {
        const empresa = await this.empresaDoUsuario(usuarioId);
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { empresaId: empresa.id };

        if (query.status) {
            where.status = query.status;
        }

        const { rows, count } = await Vaga.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        const vagaIds = rows.map((vaga) => vaga.id);

        const contagens = vagaIds.length
            ? await Candidatura.findAll({
                  where: { vagaId: vagaIds },
                  attributes: [
                      "vagaId",
                      [sequelize.fn("COUNT", sequelize.col("id")), "total"]
                  ],
                  group: ["vagaId"]
              })
            : [];

        const totalPorVaga = new Map(
            contagens.map((c) => [c.vagaId, Number(c.get("total"))])
        );

        const vagasComContagem = rows.map((vaga) => ({
            ...vaga.toJSON(),
            totalCandidaturas: totalPorVaga.get(vaga.id) ?? 0
        }));

        return montarResposta("vagas", vagasComContagem, count, pagina, limite);
    }

    /* ==========================================================
       CRIAR (empresa dona)
    ========================================================== */
    async create(data, solicitante) {
        const empresa = await this.empresaDoUsuario(solicitante.id);

        garantirEmpresaAprovada(empresa, solicitante);

        const vaga = await Vaga.create({
            ...this.filtrarCampos(data),
            empresaId: empresa.id,
            dataPublicacao: new Date(),
            status: data.status || "Aberta"
        });

        return this.findById(vaga.id);
    }

    /* ==========================================================
       ATUALIZAR (empresa dona ou administrador)
    ========================================================== */
    async update(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const vaga = await this.buscarVagaComEmpresa(id, transaction);

            garantirDono(solicitante, vaga.empresa.usuarioId);
            garantirEmpresaAprovada(vaga.empresa, solicitante);

            await vaga.update(this.filtrarCampos(data), { transaction });
            await transaction.commit();

            return this.findById(id);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       ALTERAR STATUS
    ========================================================== */
    async alterarStatus(id, status, solicitante) {
        const vaga = await this.buscarVagaComEmpresa(id);

        garantirDono(solicitante, vaga.empresa.usuarioId);
        garantirEmpresaAprovada(vaga.empresa, solicitante);

        vaga.status = status;
        await vaga.save();

        return vaga;
    }

    /* ==========================================================
       REMOVER (empresa dona ou administrador)
    ========================================================== */
    async delete(id, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const vaga = await this.buscarVagaComEmpresa(id, transaction);

            garantirDono(solicitante, vaga.empresa.usuarioId);
            garantirEmpresaAprovada(vaga.empresa, solicitante);

            await vaga.destroy({ transaction });
            await transaction.commit();

            return { mensagem: "Vaga removida com sucesso." };
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       ESTATÍSTICAS DA VAGA (empresa dona)
    ========================================================== */
    async estatisticas(id, solicitante) {
        const vaga = await this.buscarVagaComEmpresa(id);

        garantirDono(solicitante, vaga.empresa.usuarioId);
        garantirEmpresaAprovada(vaga.empresa, solicitante);

        const total = await Candidatura.count({ where: { vagaId: id } });

        const porStatus = await Candidatura.findAll({
            where: { vagaId: id },
            attributes: [
                "status",
                [sequelize.fn("COUNT", sequelize.col("id")), "total"]
            ],
            group: ["status"]
        });

        return { vagaId: id, total, porStatus };
    }
}

export default new VagaService();
