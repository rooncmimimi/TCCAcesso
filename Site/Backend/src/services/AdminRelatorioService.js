import { Op, fn, col, literal } from "sequelize";

import {
    Usuario,
    Empresa,
    Vaga,
    Candidatura,
    Postagem,
    Deficiencia,
    CandidatoDeficiencia
} from "../models/index.js";

/**
 * Painel administrativo — métricas agregadas para o dashboard de
 * relatórios. Somente leitura: nenhuma autorização própria além de
 * `authMiddleware`/`rbacMiddleware("administrador")`, já aplicados na rota.
 */
class AdminRelatorioService {
    async relatorios() {
        const [
            totalUsuarios,
            totalCandidatos,
            totalEmpresas,
            empresasPendentes,
            totalVagas,
            vagasAbertas,
            totalCandidaturas,
            totalPostagens,
            usuariosBloqueados
        ] = await Promise.all([
            Usuario.count(),
            Usuario.count({ where: { tipoUsuario: "candidato" } }),
            Usuario.count({ where: { tipoUsuario: "empresa" } }),
            Empresa.count({ where: { statusAprovacao: "pendente" } }),
            Vaga.count(),
            Vaga.count({ where: { status: "Aberta" } }),
            Candidatura.count(),
            Postagem.count({ where: { ativo: true } }),
            Usuario.count({ where: { bloqueado: true } })
        ]);

        const candidaturasPorStatus = await Candidatura.findAll({
            attributes: ["status", [fn("COUNT", col("id")), "total"]],
            group: ["status"]
        });

        const cadastrosPorMes = await Usuario.findAll({
            attributes: [
                [fn("TO_CHAR", col("created_at"), "YYYY-MM"), "mes"],
                [fn("COUNT", col("id")), "total"]
            ],
            where: {
                created_at: {
                    [Op.gte]: literal("NOW() - INTERVAL '12 months'")
                }
            },

            group: [literal("1")],
            order: [literal("1 ASC")]
        });

        const deficienciasMaisComuns = await CandidatoDeficiencia.findAll({
            attributes: [
                "deficienciaId",
                [fn("COUNT", col("CandidatoDeficiencia.id")), "total"]
            ],
            include: [
                {
                    model: Deficiencia,
                    as: "deficiencia",
                    attributes: ["nome", "descricao"]
                }
            ],
            group: ["CandidatoDeficiencia.deficiencia_id", "deficiencia.id"],
            order: [[literal("total"), "DESC"]],
            limit: 10
        });

        const taxaContratacao = await Candidatura.count({
            where: { status: "Aprovada" }
        });

        return {
            totais: {
                usuarios: totalUsuarios,
                candidatos: totalCandidatos,
                empresas: totalEmpresas,
                empresasPendentes,
                vagas: totalVagas,
                vagasAbertas,
                candidaturas: totalCandidaturas,
                postagens: totalPostagens,
                usuariosBloqueados,
                contratacoes: taxaContratacao
            },
            candidaturasPorStatus,
            cadastrosPorMes,
            deficienciasMaisComuns,
            atualizadoEm: new Date().toISOString()
        };
    }
}

export default new AdminRelatorioService();
