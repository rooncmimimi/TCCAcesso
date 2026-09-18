import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import { Vaga, Empresa, Usuario, Candidatura } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { garantirDono, garantirEmpresaAprovada, ehAdministrador } from "../utils/autorizacao.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";

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
    "acessibilidade",
    "recursosAcessibilidade",
    "publicoAlvo",
    "status",
    "dataEncerramento"
];

/**
 * Vagas: listagem e detalhe públicos (vaga de empresa não aprovada não aparece), gestão pela
 * empresa dona e moderação pelo administrador, que fica registrada no log de auditoria.
 */
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
            throw ErroApi.acessoNegado(
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
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        return vaga;
    }

    /* Listar (público): só vagas abertas, por padrão */
    async listar(query) {
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
            status: status || "aberta",
            // Vaga de empresa suspensa, reprovada ou pendente some da listagem pública. Filtra pela
            // tabela associada (`'$associacao.coluna$'`) sem uma segunda consulta, como
            // `PostagemService` e `PublicoService`.
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

        // O filtro `exclusivaPcd` da API é uma forma abreviada de pedir os dois públicos-alvo que
        // incluem PCD; o banco guarda só `publicoAlvo`.
        if (exclusivaPcd === "true" || exclusivaPcd === true) {
            where.publicoAlvo = { [Op.in]: ["pcd", "pcd_cinquenta_mais"] };
        } else if (exclusivaPcd === "false" || exclusivaPcd === false) {
            where.publicoAlvo = { [Op.notIn]: ["pcd", "pcd_cinquenta_mais"] };
        }

        if (publicoAlvo) {
            where.publicoAlvo = publicoAlvo;
        }

        if (recursosAcessibilidade) {
            // Aceita tanto `?recursosAcessibilidade=a,b` (querystring) quanto um array já
            // resolvido. Usa o índice GIN `idx_vagas_recursos_acessibilidade`.
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
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("vagas", rows, count, pagina, limite);
    }

    /*
     * Buscar por id (público). A rota não exige autenticação; `solicitante` só existe quando um
     * token válido acompanha a requisição (`autenticacaoOpcionalMiddleware`).
     */
    async buscarPorId(id, solicitante) {
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
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        // Vaga de empresa não aprovada não existe para o público: recebe o mesmo "não encontrada"
        // da listagem, sem revelar a um estranho que a vaga existe e está suspensa. A empresa dona
        // e o administrador continuam vendo, em modo leitura, como em `/vagas/minhas`, que nunca
        // filtrou por status.
        const ehDonoOuAdmin =
            solicitante &&
            (String(vaga.empresa.usuarioId) === String(solicitante.id) ||
                ehAdministrador(solicitante));

        if (vaga.empresa.statusAprovacao !== "aprovada" && !ehDonoOuAdmin) {
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        return vaga;
    }

    /*
     * Vagas da empresa autenticada. Inclui `totalCandidaturas` por vaga numa única consulta
     * agregada (sem N+1), para o painel de gestão mostrar as candidaturas de cada vaga sem outra
     * chamada.
     */
    async buscarPorEmpresaAutenticada(solicitante, query) {
        const empresa = await this.empresaDoUsuario(solicitante.id);

        garantirEmpresaAprovada(empresa, solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { empresaId: empresa.id };

        if (query.status) {
            where.status = query.status;
        }

        const { rows, count } = await Vaga.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
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

    /* Criar (empresa dona) */
    async criar(data, solicitante) {
        const empresa = await this.empresaDoUsuario(solicitante.id);

        garantirEmpresaAprovada(empresa, solicitante);

        const vaga = await Vaga.create({
            ...this.filtrarCampos(data),
            empresaId: empresa.id,
            status: data.status || "aberta"
        });

        return this.buscarPorId(vaga.id);
    }

    /* Atualizar (empresa dona ou administrador) */
    async atualizar(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const vaga = await this.buscarVagaComEmpresa(id, transaction);

            garantirDono(solicitante, vaga.empresa.usuarioId);
            garantirEmpresaAprovada(vaga.empresa, solicitante);

            await vaga.update(this.filtrarCampos(data), { transaction });
            await transaction.commit();

            return this.buscarPorId(id);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* Alterar status */
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
            await AdminAuditoriaService.registrar({
                administradorId: solicitante.id,
                acao: "alterar_status_vaga",
                entidadeTipo: "vaga",
                entidadeId: vaga.id,
                descricao: `Status da vaga "${vaga.titulo}" alterado para ${status} pela moderação.`,
                metadados: {
                    antes: { status: statusAnterior },
                    depois: { status }
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return vaga;
    }

    /* Remover (empresa dona ou administrador) */
    async excluir(id, solicitante, contexto = {}) {
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
            await AdminAuditoriaService.registrar({
                administradorId: solicitante.id,
                acao: "excluir_vaga",
                entidadeTipo: "vaga",
                entidadeId: vagaRemovida.id,
                descricao: `Vaga "${vagaRemovida.titulo}" removida pela moderação.`,
                metadados: { vaga: vagaRemovida },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return { mensagem: "Vaga removida com sucesso." };
    }

    /* Estatísticas da vaga (empresa dona) */
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
