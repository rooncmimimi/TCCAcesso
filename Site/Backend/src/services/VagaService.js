import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Vaga, Empresa, Usuario, Candidatura } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, garantirEmpresaAprovada, ehAdministrador } from "../utils/authorization.js";
import AdminAuditService from "./AdminAuditService.js";

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
    "recursosAcessibilidade",
    "publicoAlvo",
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
            publicoAlvo,
            recursosAcessibilidade,
            empresaId,
            status
        } = query;

        const where = {
            status: status || "Aberta",
            // Fase 9: vaga de empresa suspensa/reprovada/pendente some dos
            // fluxos públicos (listagem geral) — mesmo padrão já usado em
            // PostagemService/PublicoService (`'$associacao.coluna$'`) para
            // filtrar pela tabela associada sem uma segunda consulta.
            "$empresa.status_aprovacao$": "aprovada"
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

        if (publicoAlvo) {
            where.publicoAlvo = publicoAlvo;
        }

        if (recursosAcessibilidade) {
            // Aceita tanto `?recursosAcessibilidade=a,b` (querystring) quanto
            // um array já resolvido — usa o índice GIN da migration 0013.
            const lista = Array.isArray(recursosAcessibilidade)
                ? recursosAcessibilidade
                : String(recursosAcessibilidade).split(",").filter(Boolean);

            if (lista.length > 0) {
                where.recursosAcessibilidade = { [Op.contains]: lista };
            }
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
       BUSCAR POR ID (público — rota sem authMiddleware, `solicitante` só
       existe quando um token válido acompanha a requisição, via
       `authOpcionalMiddleware`)
    ========================================================== */
    async findById(id, solicitante) {
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

        // Fase 9: vaga de empresa não aprovada não existe para o público
        // em geral — mesmo tratamento de "não encontrada" da listagem
        // (nunca revela a um estranho que a vaga existe mas está
        // suspensa). A própria empresa dona e o administrador continuam
        // enxergando (acesso de somente leitura ao próprio histórico,
        // consistente com `/vagas/minhas`, que nunca filtrou por status).
        const ehDonoOuAdmin =
            solicitante &&
            (String(vaga.empresa.usuarioId) === String(solicitante.id) ||
                ehAdministrador(solicitante));

        if (vaga.empresa.statusAprovacao !== "aprovada" && !ehDonoOuAdmin) {
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
    async alterarStatus(id, status, solicitante, contexto = {}) {
        const vaga = await this.buscarVagaComEmpresa(id);

        garantirDono(solicitante, vaga.empresa.usuarioId);
        garantirEmpresaAprovada(vaga.empresa, solicitante);

        const ehModeracao =
            ehAdministrador(solicitante) &&
            String(vaga.empresa.usuarioId) !== String(solicitante.id);
        const statusAnterior = vaga.status;

        vaga.status = status;
        await vaga.save();

        if (ehModeracao) {
            await AdminAuditService.log({
                adminId: solicitante.id,
                acao: "ALTERAR_STATUS_VAGA",
                entidadeTipo: "vaga",
                entidadeId: vaga.id,
                descricao: `Status da vaga "${vaga.titulo}" alterado para ${status} pela moderação.`,
                metadata: {
                    before: { status: statusAnterior },
                    after: { status }
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return vaga;
    }

    /* ==========================================================
       REMOVER (empresa dona ou administrador)
    ========================================================== */
    async delete(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let vagaRemovida;
        let ehModeracao = false;

        try {
            const vaga = await this.buscarVagaComEmpresa(id, transaction);

            garantirDono(solicitante, vaga.empresa.usuarioId);
            garantirEmpresaAprovada(vaga.empresa, solicitante);

            ehModeracao =
                ehAdministrador(solicitante) &&
                String(vaga.empresa.usuarioId) !== String(solicitante.id);
            vagaRemovida = { id: vaga.id, titulo: vaga.titulo, empresaId: vaga.empresaId };

            await vaga.destroy({ transaction });
            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        if (ehModeracao) {
            await AdminAuditService.log({
                adminId: solicitante.id,
                acao: "EXCLUIR_VAGA",
                entidadeTipo: "vaga",
                entidadeId: vagaRemovida.id,
                descricao: `Vaga "${vagaRemovida.titulo}" removida pela moderação.`,
                metadata: { vaga: vagaRemovida },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return { mensagem: "Vaga removida com sucesso." };
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
