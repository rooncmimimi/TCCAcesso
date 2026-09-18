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
    async paginaInicial() {
        // A página pública não mostra "contratações" (candidaturas aprovadas): o ACESSO aproxima
        // empresa e candidato, mas não confirma contratação, então o número prometeria um dado que
        // a plataforma não tem. `candidaturas`, sem filtro de status, é o dado real usado no lugar.
        const [empresas, vagasAbertas, candidatos, candidaturas] =
            await Promise.all([
                Empresa.count({ where: { statusAprovacao: "aprovada" } }),
                Vaga.count({ where: { status: "aberta", oculta: false } }),
                Usuario.count({
                    where: { tipoUsuario: "candidato", ativo: true }
                }),
                Candidatura.count()
            ]);

        const [vagasDestaque, empresasParceiras, publicacoes] =
            await Promise.all([
                Vaga.findAll({
                    where: {
                        status: "aberta",
                        oculta: false,
                        // Mesmo filtro de `VagaService.listar`: a vitrine pública nunca destaca
                        // vaga de empresa suspensa, reprovada ou pendente.
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
                    order: [["criadoEm", "DESC"]]
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
                    order: [["criadoEm", "DESC"]]
                }).then(async (empresas) => {
                    // Total de vagas abertas por empresa, numa única consulta agregada (nunca uma
                    // consulta por empresa), como em `VagaService.buscarPorEmpresaAutenticada`.
                    if (empresas.length === 0) return empresas;

                    const contagens = await Vaga.findAll({
                        where: {
                            empresaId: empresas.map((e) => e.id),
                            status: "aberta",
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
                    // Visitante anônimo nunca é seguidor aprovado, então a prévia da página inicial
                    // nunca mostra postagem de autor com perfil privado, mesmo marcada como
                    // `publica`.
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
                        // Sem os anexos aqui, `assinarMidiaDasPostagens` não teria o que assinar e a
                        // mídia viria com o caminho cru, que não abre o arquivo.
                        {
                            model: PostagemAnexo,
                            as: "anexos",
                            attributes: ["id", "url"],
                            separate: true
                        }
                    ],
                    limit: 3,
                    order: [["criadoEm", "DESC"]]
                }).then(async (postagens) => {
                    // Já filtrado a autores públicos acima; só então as URLs de exibição são
                    // resolvidas. Sem `solicitante` é um visitante anônimo, e o helper decide a
                    // validade maior sozinho.
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
                candidaturas
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
                status: "aberta",
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
            order: [["criadoEm", "DESC"]]
        });
    }
}

export default new PublicoService();
