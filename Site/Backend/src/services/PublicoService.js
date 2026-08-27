import { Op } from "sequelize";

import {
    Usuario,
    Empresa,
    Vaga,
    Postagem,
    Candidatura
} from "../models/index.js";

/**
 * Dados públicos da home (sem autenticação).
 * Retorna apenas informações não sensíveis.
 */
class PublicoService {
    async home() {
        const [empresas, vagasAbertas, candidatos, contratacoes] =
            await Promise.all([
                Empresa.count({ where: { statusAprovacao: "aprovada" } }),
                Vaga.count({ where: { status: "Aberta", oculta: false } }),
                Usuario.count({
                    where: { tipoUsuario: "candidato", ativo: true }
                }),
                Candidatura.count({ where: { status: "Aprovada" } })
            ]);

        const [vagasDestaque, empresasParceiras, publicacoes] =
            await Promise.all([
                Vaga.findAll({
                    where: { status: "Aberta", oculta: false },
                    include: [
                        {
                            model: Empresa,
                            as: "empresa",
                            attributes: [
                                "id",
                                "nomeFantasia",
                                "logo",
                                "cidade",
                                "estado"
                            ]
                        }
                    ],
                    limit: 6,
                    order: [["created_at", "DESC"]]
                }),
                Empresa.findAll({
                    where: { statusAprovacao: "aprovada" },
                    attributes: [
                        "id",
                        "nomeFantasia",
                        "logo",
                        "setor",
                        "cidade",
                        "estado"
                    ],
                    limit: 12,
                    order: [["created_at", "DESC"]]
                }),
                Postagem.findAll({
                    where: { ativo: true, publica: true },
                    include: [
                        {
                            model: Usuario,
                            as: "usuario",
                            attributes: [
                                "id",
                                "nome",
                                "fotoPerfil",
                                "tipoUsuario"
                            ]
                        }
                    ],
                    limit: 3,
                    order: [["created_at", "DESC"]]
                })
            ]);

        return {
            estatisticas: {
                empresas,
                vagasAbertas,
                candidatos,
                contratacoes
            },
            vagasDestaque,
            empresasParceiras,
            publicacoes
        };
    }

    async vagasPublicas(query) {
        const limite = Math.min(Number(query.limit) || 10, 50);

        return Vaga.findAll({
            where: {
                status: "Aberta",
                oculta: false,
                ...(query.q
                    ? {
                          titulo: {
                              [Op.iLike]: `%${String(query.q).slice(0, 120)}%`
                          }
                      }
                    : {})
            },
            include: [
                {
                    model: Empresa,
                    as: "empresa",
                    attributes: ["id", "nomeFantasia", "logo", "cidade", "estado"]
                }
            ],
            limit: limite,
            order: [["created_at", "DESC"]]
        });
    }
}

export default new PublicoService();
