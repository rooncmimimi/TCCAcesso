import { Op, fn, col } from "sequelize";

import {
    Usuario,
    Empresa,
    Vaga,
    Postagem,
    PostagemAnexo,
    Candidatura
} from "../models/index.js";
import { assinarMidiaDasPostagens } from "./PostagemService.js";

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
                    where: {
                        status: "Aberta",
                        oculta: false,
                        // Fase 9: mesmo filtro de VagaService.findAll —
                        // vitrine pública nunca destaca vaga de empresa
                        // suspensa/reprovada/pendente.
                        "$empresa.status_aprovacao$": "aprovada"
                    },
                    include: [
                        {
                            model: Empresa,
                            as: "empresa",
                            attributes: [
                                "id",
                                "nomeFantasia",
                                "logo",
                                "cidade",
                                "estado",
                                "empresaVerificada"
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
                        "estado",
                        "empresaVerificada"
                    ],
                    limit: 12,
                    order: [["created_at", "DESC"]]
                }).then(async (empresas) => {
                    // Total de vagas abertas por empresa, numa única consulta
                    // agregada (nunca uma query por empresa) — mesmo padrão
                    // já usado em VagaService.findByEmpresaAutenticada. Sem
                    // isso, `totalVagas` nunca existia neste endpoint.
                    if (empresas.length === 0) return empresas;

                    const contagens = await Vaga.findAll({
                        where: {
                            empresaId: empresas.map((e) => e.id),
                            status: "Aberta",
                            oculta: false
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
                }),
                Postagem.findAll({
                    // Visitante anônimo nunca pode ser "seguidor aprovado" —
                    // teaser da home nunca mostra postagem de autor com
                    // perfil privado, mesmo que a postagem em si seja
                    // marcada como `publica` (Fase 3).
                    where: {
                        ativo: true,
                        publica: true,
                        "$usuario.perfil_publico$": true
                    },
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
                        },
                        // Fase 7: sem isso, `assinarMidiaDasPostagens` não
                        // tem como saber se `imagem` está no bucket privado
                        // (não acha o anexo correspondente) e resolve
                        // errado como público — gerando uma URL quebrada
                        // pra qualquer postagem enviada depois desta fase.
                        {
                            model: PostagemAnexo,
                            as: "anexos",
                            attributes: ["id", "url", "privado"],
                            separate: true
                        }
                    ],
                    limit: 3,
                    order: [["created_at", "DESC"]]
                }).then(async (postagens) => {
                    // Fase 7: já filtrado a autor público acima — resolve a
                    // URL de exibição só depois, nunca antes (mesmo sem
                    // `solicitante`, é um visitante anônimo — sempre TTL
                    // longo, decidido internamente pelo helper).
                    const planas = postagens.map((postagem) => postagem.toJSON());
                    await assinarMidiaDasPostagens(planas);
                    return planas;
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
