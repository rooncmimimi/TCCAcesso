import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Empresa, Usuario, Vaga } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, ehAdministrador } from "../utils/authorization.js";

/** Campos que a própria empresa pode atualizar. */
const CAMPOS_EDITAVEIS = [
    "razaoSocial",
    "nomeFantasia",
    "descricao",
    "setor",
    "porte",
    "site",
    "cidade",
    "estado",
    "endereco",
    "cep",
    "logo"
];

class EmpresaService {
    filtrarCampos(data, solicitante) {
        const dados = CAMPOS_EDITAVEIS.reduce((acc, campo) => {
            if (data[campo] !== undefined) {
                acc[campo] = data[campo];
            }
            return acc;
        }, {});

        // Selo de verificação é exclusivo do administrador.
        if (ehAdministrador(solicitante) && data.empresaVerificada !== undefined) {
            dados.empresaVerificada = data.empresaVerificada;
        }

        if (ehAdministrador(solicitante) && data.cnpj !== undefined) {
            dados.cnpj = data.cnpj;
        }

        return dados;
    }

    /* ==========================================================
       LISTAR (público)
    ========================================================== */
    async findAll(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);
        const { search, cidade, estado, setor, porte, empresaVerificada } = query;

        const where = {};

        if (cidade) {
            where.cidade = { [Op.iLike]: `%${cidade}%` };
        }

        if (estado) {
            where.estado = estado.toUpperCase();
        }

        if (setor) {
            where.setor = { [Op.iLike]: `%${setor}%` };
        }

        if (porte) {
            where.porte = porte;
        }

        if (empresaVerificada !== undefined) {
            where.empresaVerificada =
                empresaVerificada === "true" || empresaVerificada === true;
        }

        if (search) {
            where[Op.or] = [
                { nomeFantasia: { [Op.iLike]: `%${search}%` } },
                { razaoSocial: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Empresa.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("empresas", rows, count, pagina, limite);
    }

    /* ==========================================================
       EMPRESAS PARCEIRAS (vitrine da home)
    ========================================================== */
    async findPartners() {
        return Empresa.findAll({
            where: { empresaVerificada: true },
            order: [["created_at", "DESC"]],
            limit: 6
        });
    }

    /* ==========================================================
       BUSCAR POR ID (público)
    ========================================================== */
    async findById(id) {
        const empresa = await Empresa.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil"]
                },
                {
                    model: Vaga,
                    as: "vagas",
                    where: { status: "Aberta" },
                    required: false
                }
            ]
        });

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        return empresa;
    }

    /* ==========================================================
       PERFIL DA EMPRESA AUTENTICADA
    ========================================================== */
    async findByUsuario(usuarioId) {
        const empresa = await Empresa.findOne({
            where: { usuarioId },
            include: [{ model: Usuario, as: "usuario" }]
        });

        if (!empresa) {
            throw ApiError.notFound("Perfil de empresa não encontrado.");
        }

        return empresa;
    }

    /* ==========================================================
       ATUALIZAR (dona ou administrador)
    ========================================================== */
    async update(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const empresa = await Empresa.findByPk(id, { transaction });

            if (!empresa) {
                throw ApiError.notFound("Empresa não encontrada.");
            }

            garantirDono(solicitante, empresa.usuarioId);

            await empresa.update(this.filtrarCampos(data, solicitante), {
                transaction
            });

            await transaction.commit();

            return empresa;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       REMOVER (administrador)
    ========================================================== */
    async delete(id) {
        const transaction = await sequelize.transaction();

        try {
            const empresa = await Empresa.findByPk(id, { transaction });

            if (!empresa) {
                throw ApiError.notFound("Empresa não encontrada.");
            }

            await empresa.destroy({ transaction });
            await transaction.commit();

            return { mensagem: "Empresa removida com sucesso." };
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }
}

export default new EmpresaService();
