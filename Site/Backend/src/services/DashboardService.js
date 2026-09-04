import {
    Usuario,
    Candidato,
    Empresa,
    Vaga,
    Candidatura,
    Postagem,
    UsuarioSeguido,
    EmpresaSeguida,
    FavoritoVaga
} from "../models/index.js";
import sequelize from "../config/database.js";
import { garantirEmpresaAprovadaSeForEmpresa } from "../utils/authorization.js";

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

    async empresa(solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const usuarioId = solicitante.id;
        const empresa = await Empresa.findOne({ where: { usuarioId } });

        if (!empresa) {
            return {
                vagas: 0,
                vagasAbertas: 0,
                candidaturas: 0,
                candidaturasPendentes: 0,
                postagens: 0,
                seguidores: 0
            };
        }

        const vagas = await Vaga.findAll({
            where: { empresaId: empresa.id },
            attributes: ["id", "status"]
        });

        const vagaIds = vagas.map((vaga) => vaga.id);

        const [totalCandidaturas, candidaturasPendentes, totalPostagens, totalSeguidores] =
            await Promise.all([
                vagaIds.length
                    ? Candidatura.count({ where: { vagaId: vagaIds } })
                    : 0,
                vagaIds.length
                    ? Candidatura.count({
                          where: { vagaId: vagaIds, status: "Pendente" }
                      })
                    : 0,
                Postagem.count({ where: { usuarioId, ativo: true } }),
                EmpresaSeguida.count({ where: { empresaId: empresa.id } })
            ]);

        return {
            vagas: vagas.length,
            vagasAbertas: vagas.filter((vaga) => vaga.status === "Aberta").length,
            candidaturas: totalCandidaturas,
            candidaturasPendentes,
            postagens: totalPostagens,
            seguidores: totalSeguidores
        };
    }

    async candidato(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            return {
                candidaturas: 0,
                emAndamento: 0,
                aprovadas: 0,
                vagasFavoritas: 0,
                postagens: 0,
                seguidores: 0
            };
        }

        const [totalCandidaturas, emAndamento, aprovadas, vagasFavoritas, totalPostagens, totalSeguidores] =
            await Promise.all([
                Candidatura.count({ where: { candidatoId: candidato.id } }),
                Candidatura.count({
                    where: {
                        candidatoId: candidato.id,
                        status: ["Pendente", "Visualizada", "EmAnalise"]
                    }
                }),
                Candidatura.count({
                    where: { candidatoId: candidato.id, status: "Aprovada" }
                }),
                FavoritoVaga.count({ where: { candidatoId: candidato.id } }),
                Postagem.count({ where: { usuarioId, ativo: true } }),
                UsuarioSeguido.count({ where: { seguidoId: usuarioId } })
            ]);

        return {
            candidaturas: totalCandidaturas,
            emAndamento,
            aprovadas,
            vagasFavoritas,
            postagens: totalPostagens,
            seguidores: totalSeguidores
        };
    }
}

export default new DashboardService();
