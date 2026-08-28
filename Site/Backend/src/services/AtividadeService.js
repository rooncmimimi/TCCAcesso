import {
    Candidato,
    Candidatura,
    Vaga,
    Empresa,
    FavoritoVaga,
    UsuarioSeguido,
    EmpresaSeguida,
    Usuario,
    Curtida,
    Comentario,
    Compartilhamento,
    Postagem
} from "../models/index.js";

/** Prévia por categoria — "ver tudo" usa os endpoints já existentes (candidaturas/minhas, dashboard/favoritos etc). */
const LIMITE_PREVIA = 5;

const ATRIBUTOS_EMPRESA_RESUMO = ["id", "usuarioId", "nomeFantasia", "razaoSocial", "logo", "empresaVerificada"];
const ATRIBUTOS_PERFIL_RESUMO = ["id", "nome", "fotoPerfil", "tipoUsuario"];
const ATRIBUTOS_POSTAGEM_RESUMO = ["id", "conteudo", "usuarioId", "created_at"];

/**
 * "Minha atividade": agrega dados que já existem em outras tabelas
 * (candidaturas, favoritos, seguidores, curtidas, comentários,
 * compartilhamentos) numa única leitura de resumo. Não cria nenhuma tabela
 * nova e não registra histórico algum (sem visualizações, sem buscas).
 *
 * Estritamente privada: o escopo vem sempre de `solicitante.id`, nunca de um
 * parâmetro de rota — por isso é estruturalmente impossível um usuário ler a
 * atividade de outro através desta rota.
 */
class AtividadeService {
    async minha(solicitante) {
        const candidato = await Candidato.findOne({ where: { usuarioId: solicitante.id } });

        const [
            candidaturas,
            totalCandidaturas,
            vagasFavoritas,
            totalVagasFavoritas,
            empresasSeguidas,
            totalEmpresasSeguidas,
            pessoasSeguidasVinculos,
            totalPessoasSeguidas,
            curtidas,
            totalCurtidas,
            comentarios,
            totalComentarios,
            compartilhamentos,
            totalCompartilhamentos
        ] = await Promise.all([
            candidato
                ? Candidatura.findAll({
                      where: { candidatoId: candidato.id },
                      include: [
                          {
                              model: Vaga,
                              as: "vaga",
                              attributes: ["id", "titulo"],
                              include: [{ model: Empresa, as: "empresa", attributes: ATRIBUTOS_EMPRESA_RESUMO }]
                          }
                      ],
                      limit: LIMITE_PREVIA,
                      order: [["data_candidatura", "DESC"]]
                  })
                : [],
            candidato ? Candidatura.count({ where: { candidatoId: candidato.id } }) : 0,

            candidato
                ? FavoritoVaga.findAll({
                      where: { candidatoId: candidato.id },
                      include: [
                          {
                              model: Vaga,
                              as: "vaga",
                              attributes: ["id", "titulo"],
                              include: [{ model: Empresa, as: "empresa", attributes: ATRIBUTOS_EMPRESA_RESUMO }]
                          }
                      ],
                      limit: LIMITE_PREVIA,
                      order: [["created_at", "DESC"]]
                  })
                : [],
            candidato ? FavoritoVaga.count({ where: { candidatoId: candidato.id } }) : 0,

            candidato
                ? EmpresaSeguida.findAll({
                      where: { candidatoId: candidato.id },
                      include: [{ model: Empresa, as: "empresa", attributes: ATRIBUTOS_EMPRESA_RESUMO }],
                      limit: LIMITE_PREVIA,
                      order: [["created_at", "DESC"]]
                  })
                : [],
            candidato ? EmpresaSeguida.count({ where: { candidatoId: candidato.id } }) : 0,

            UsuarioSeguido.findAll({
                where: { seguidorId: solicitante.id },
                include: [{ model: Usuario, as: "seguido", attributes: ATRIBUTOS_PERFIL_RESUMO }],
                limit: LIMITE_PREVIA,
                order: [["created_at", "DESC"]]
            }),
            UsuarioSeguido.count({ where: { seguidorId: solicitante.id } }),

            Curtida.findAll({
                where: { usuarioId: solicitante.id },
                include: [
                    { model: Postagem, as: "postagem", attributes: ATRIBUTOS_POSTAGEM_RESUMO, where: { ativo: true }, required: true }
                ],
                limit: LIMITE_PREVIA,
                order: [["created_at", "DESC"]]
            }),
            Curtida.count({ where: { usuarioId: solicitante.id } }),

            Comentario.findAll({
                where: { usuarioId: solicitante.id, ativo: true },
                include: [
                    { model: Postagem, as: "postagem", attributes: ATRIBUTOS_POSTAGEM_RESUMO, where: { ativo: true }, required: true }
                ],
                limit: LIMITE_PREVIA,
                order: [["created_at", "DESC"]]
            }),
            Comentario.count({ where: { usuarioId: solicitante.id, ativo: true } }),

            Compartilhamento.findAll({
                where: { usuarioId: solicitante.id },
                include: [
                    { model: Postagem, as: "postagem", attributes: ATRIBUTOS_POSTAGEM_RESUMO, where: { ativo: true }, required: true }
                ],
                limit: LIMITE_PREVIA,
                order: [["created_at", "DESC"]]
            }),
            Compartilhamento.count({ where: { usuarioId: solicitante.id } })
        ]);

        return {
            ehCandidato: Boolean(candidato),
            candidaturas: { itens: candidaturas, total: totalCandidaturas },
            vagasFavoritas: { itens: vagasFavoritas, total: totalVagasFavoritas },
            seguindo: {
                pessoas: {
                    itens: pessoasSeguidasVinculos.map((vinculo) => vinculo.seguido),
                    total: totalPessoasSeguidas
                },
                empresas: { itens: empresasSeguidas, total: totalEmpresasSeguidas }
            },
            interacoesFeed: {
                curtidas: { itens: curtidas, total: totalCurtidas },
                comentarios: { itens: comentarios, total: totalComentarios },
                compartilhamentos: { itens: compartilhamentos, total: totalCompartilhamentos }
            }
        };
    }
}

export default new AtividadeService();
