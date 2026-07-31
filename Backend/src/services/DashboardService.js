import {
    Usuario,
    Candidato,
    Empresa,
    Vaga,
    Candidatura,
    Postagem
} from "../models/index.js";
import sequelize from "../config/database.js";

/**
 * Métricas agregadas.
 * - dashboard administrativo: visão global (restrito a administradores);
 * - dashboard da empresa / candidato: escopado ao próprio perfil.
 */
class DashboardService {
    async admin() {
        const [
            totalUsuarios,
            totalCandidatos,
            totalEmpresas,
            totalVagas,
            vagasAbertas,
            totalCandidaturas,
            totalPostagens
        ] = await Promise.all([
            Usuario.count(),
            Candidato.count(),
            Empresa.count(),
            Vaga.count(),
            Vaga.count({ where: { status: "Aberta" } }),
            Candidatura.count(),
            Postagem.count({ where: { ativo: true } })
        ]);

        const candidaturasPorStatus = await Candidatura.findAll({
            attributes: [
                "status",
                [sequelize.fn("COUNT", sequelize.col("id")), "total"]
            ],
            group: ["status"]
        });

        return {
            totalUsuarios,
            totalCandidatos,
            totalEmpresas,
            totalVagas,
            vagasAbertas,
            totalCandidaturas,
            totalPostagens,
            candidaturasPorStatus
        };
    }

    async empresa(usuarioId) {
        const empresa = await Empresa.findOne({ where: { usuarioId } });

        if (!empresa) {
            return {
                totalVagas: 0,
                vagasAbertas: 0,
                totalCandidaturas: 0,
                candidaturasPendentes: 0
            };
        }

        const vagas = await Vaga.findAll({
            where: { empresaId: empresa.id },
            attributes: ["id", "status"]
        });

        const vagaIds = vagas.map((vaga) => vaga.id);

        const [totalCandidaturas, candidaturasPendentes] = await Promise.all([
            vagaIds.length
                ? Candidatura.count({ where: { vagaId: vagaIds } })
                : 0,
            vagaIds.length
                ? Candidatura.count({
                      where: { vagaId: vagaIds, status: "Pendente" }
                  })
                : 0
        ]);

        return {
            totalVagas: vagas.length,
            vagasAbertas: vagas.filter((vaga) => vaga.status === "Aberta").length,
            totalCandidaturas,
            candidaturasPendentes
        };
    }

    async candidato(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            return { totalCandidaturas: 0, emAndamento: 0, aprovadas: 0 };
        }

        const [totalCandidaturas, emAndamento, aprovadas] = await Promise.all([
            Candidatura.count({ where: { candidatoId: candidato.id } }),
            Candidatura.count({
                where: {
                    candidatoId: candidato.id,
                    status: ["Pendente", "Visualizada", "EmAnalise"]
                }
            }),
            Candidatura.count({
                where: { candidatoId: candidato.id, status: "Aprovada" }
            })
        ]);

        return { totalCandidaturas, emAndamento, aprovadas };
    }
}

export default new DashboardService();
