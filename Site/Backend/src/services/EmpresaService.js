import { Op, fn, col } from "sequelize";
import sequelize from "../config/database.js";
import { Empresa, Usuario, Vaga } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, ehAdministrador, garantirEmpresaAprovada } from "../utils/authorization.js";
import BloqueioService from "./BloqueioService.js";
import AdminAuditService from "./AdminAuditService.js";

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
    "logo",
    "capa",
    "culturaInclusiva"
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
       Critério de produto: "parceira" = aprovada pela plataforma
       (pode publicar vagas). O selo "verificada" é um reconhecimento
       ADICIONAL de confiança, independente — nunca um requisito para
       aparecer como parceira. Mesmo critério de PublicoService.home().
    ========================================================== */
    async findPartners() {
        const empresas = await Empresa.findAll({
            where: { statusAprovacao: "aprovada" },
            order: [
                ["empresaVerificada", "DESC"],
                ["created_at", "DESC"]
            ],
            limit: 6
        });

        if (empresas.length === 0) return empresas;

        // Mesmo padrão de VagaService.findByEmpresaAutenticada / PublicoService.home:
        // uma única consulta agregada, nunca uma por empresa.
        const contagens = await Vaga.findAll({
            where: {
                empresaId: empresas.map((empresa) => empresa.id),
                status: "Aberta"
            },
            attributes: ["empresaId", [fn("COUNT", col("id")), "total"]],
            group: ["empresaId"]
        });

        const totalPorEmpresa = new Map(
            contagens.map((c) => [c.empresaId, Number(c.get("total"))])
        );

        return empresas.map((empresa) => {
            const objeto = empresa.toJSON();
            objeto.totalVagas = totalPorEmpresa.get(empresa.id) ?? 0;
            return objeto;
        });
    }

    /* ==========================================================
       BUSCAR POR ID (público)
    ========================================================== */
    async findById(id, solicitante) {
        const empresa = await Empresa.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil", "perfilPublico"]
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

        await BloqueioService.garantirVisibilidadePerfil(
            empresa.usuario,
            solicitante
        );

        return empresa;
    }

    /**
     * Perfil público resolvido a partir do `usuarioId` do autor de uma
     * postagem/comentário — permite "clicar na foto/nome no feed" quando o
     * autor é uma conta empresa, sem o cliente conhecer o `empresaId` antes.
     * Diferente de `findByUsuario` (usada só em /empresas/me): aqui o
     * `Usuario` incluído é restrito a campos públicos (sem e-mail/telefone).
     */
    async findByUsuarioPublico(usuarioId, solicitante) {
        const empresa = await Empresa.findOne({
            where: { usuarioId },
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil", "perfilPublico"]
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

        await BloqueioService.garantirVisibilidadePerfil(
            empresa.usuario,
            solicitante
        );

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
            garantirEmpresaAprovada(empresa, solicitante);

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
       Rota já restrita a administrador (rbacMiddleware) — não há caminho
       de "dono" aqui, então a auditoria é sempre registrada.
    ========================================================== */
    async delete(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let empresaRemovida;

        try {
            const empresa = await Empresa.findByPk(id, { transaction });

            if (!empresa) {
                throw ApiError.notFound("Empresa não encontrada.");
            }

            empresaRemovida = {
                id: empresa.id,
                razaoSocial: empresa.razaoSocial,
                usuarioId: empresa.usuarioId
            };

            await empresa.destroy({ transaction });
            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "EXCLUIR_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: id,
            descricao: `Empresa ${empresaRemovida.razaoSocial} foi removida.`,
            metadata: { empresa: empresaRemovida },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return { mensagem: "Empresa removida com sucesso." };
    }
}

export default new EmpresaService();
