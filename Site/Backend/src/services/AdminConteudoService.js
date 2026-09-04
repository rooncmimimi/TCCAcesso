import { Op } from "sequelize";

import sequelize from "../config/database.js";
import {
    Usuario,
    Empresa,
    Vaga,
    Postagem,
    PostagemAnexo,
    Comentario,
    Curtida
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";
import PostagemService from "./PostagemService.js";

/**
 * Nomes legíveis (singular/plural) por tipo de anexo — só para compor a
 * frase do log de auditoria (Fase 8). Mesmos 3 valores do ENUM de
 * `PostagemAnexo.tipo`.
 */
const NOMES_TIPO_ANEXO = {
    imagem: ["imagem", "imagens"],
    video: ["vídeo", "vídeos"],
    documento: ["documento", "documentos"]
};

const pluralizar = (quantidade, singular, plural) =>
    `${quantidade} ${quantidade === 1 ? singular : plural}`;

/**
 * Monta a descrição em texto corrido do log de "remover postagem"
 * (Fase 8, Parte 15) a partir de um snapshot já capturado ANTES da
 * remoção — nunca reconsulta a postagem (que pode já não existir mais
 * quando o log for lido depois, ver auditoria da Fase 8, item 4).
 * Exemplo: "Pedro Lima removeu uma publicação de João Silva. A
 * publicação continha: texto; 1 imagem; 12 curtidas; 3 comentários."
 */
function descreverRemocaoPostagem(admin, snapshot) {
    const partesConteudo = [];

    if (snapshot.conteudo && snapshot.conteudo.trim()) {
        partesConteudo.push("texto");
    }

    for (const [tipo, quantidade] of Object.entries(snapshot.midiaPorTipo || {})) {
        const [singular, plural] = NOMES_TIPO_ANEXO[tipo] || [tipo, tipo];
        partesConteudo.push(pluralizar(quantidade, singular, plural));
    }

    if (partesConteudo.length === 0) {
        partesConteudo.push("nenhum conteúdo registrado");
    }

    return (
        `${admin.nome} removeu uma publicação de ${snapshot.nomeAutor ?? "um usuário removido"}. ` +
        `A publicação continha: ${partesConteudo.join("; ")}; ` +
        `${pluralizar(snapshot.totalCurtidas, "curtida", "curtidas")}; ` +
        `${pluralizar(snapshot.totalComentarios, "comentário", "comentários")}.`
    );
}

/**
 * Mesma lógica para "remover comentário" — exemplo: "Pedro Lima removeu
 * um comentário de João Silva em uma publicação de Maria Souza."
 */
function descreverRemocaoComentario(admin, snapshot) {
    return (
        `${admin.nome} removeu um comentário de ${snapshot.nomeAutor ?? "um usuário removido"} ` +
        `em uma publicação de ${snapshot.nomeAutorPostagem ?? "um usuário removido"}.`
    );
}

/**
 * Painel administrativo — moderação de conteúdo do feed (postagens,
 * comentários) e visibilidade de vagas.
 *
 * Todas as rotas que chegam aqui já passaram por authMiddleware +
 * rbacMiddleware("administrador"); ainda assim os métodos nunca
 * confiam em identificadores do corpo da requisição para escalonar
 * privilégios (defesa em profundidade).
 */
class AdminConteudoService {
    async listarPostagens(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };

        if (query.q) {
            where.conteudo = { [Op.iLike]: `%${String(query.q).slice(0, 120)}%` };
        }

        const { rows, count } = await Postagem.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "tipoUsuario"]
                },
                // Fase 8: sem isso, `PostagemService.decorar` (via
                // `assinarMidiaDasPostagens`) não acha o anexo
                // correspondente a `imagem` e resolve a privacidade errado
                // — mesmo cuidado já necessário em BuscaService/
                // PublicoService na Fase 7.
                {
                    model: PostagemAnexo,
                    as: "anexos",
                    attributes: ["id", "url", "tipo", "privado", "descricao"],
                    separate: true
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        // Reaproveita a mesma decoração usada no feed (contadores de
        // curtidas/comentários + URLs de mídia assinadas) — nunca duplicar
        // a lógica de Storage aqui (Fase 8, Parte 30: "não recrie a
        // lógica de signed URL"). `solicitante: null` — só afeta
        // `curtidoPorMim`, irrelevante para o painel administrativo.
        const decoradas = await PostagemService.decorar(rows, null);

        return montarResposta("postagens", decoradas, count, pagina, limite);
    }

    async listarComentarios(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };
        if (query.postagemId) where.postagemId = query.postagemId;
        if (query.q) {
            where.comentario = { [Op.iLike]: `%${String(query.q).slice(0, 120)}%` };
        }

        const { rows, count } = await Comentario.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "tipoUsuario"]
                },
                {
                    model: Postagem,
                    as: "postagem",
                    attributes: ["id", "conteudo"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("comentarios", rows, count, pagina, limite);
    }

    /**
     * Remoção idempotente (Fase 8, Parte 11): trava a linha e reconfirma
     * `ativo===true` DENTRO da transação, mesmo padrão de
     * `AdminUsuarioService.excluirContaDefinitivamente`. Uma segunda
     * chamada contra a mesma postagem (duplo clique, retry de rede)
     * encontra `ativo:false` e recebe 409 — nunca duplica notificação
     * nem log.
     *
     * O snapshot é capturado ANTES do `update`, dentro da transação, e
     * vai para `metadata.snapshot` — nunca dado pessoal além do nome do
     * autor (sem e-mail/CPF/CNPJ). É a única fonte usada para descrever o
     * log depois, mesmo que a postagem (ou a conta do autor, via CASCADE
     * de `postagens.usuario_id`) deixe de existir no futuro.
     */
    async removerPostagem(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let postagem;

        try {
            postagem = await Postagem.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!postagem) {
                throw ApiError.notFound("Postagem não encontrada.");
            }

            if (!postagem.ativo) {
                throw ApiError.conflict("Esta publicação já foi removida.");
            }

            const [autor, totalCurtidas, totalComentarios, anexos] = await Promise.all([
                Usuario.findByPk(postagem.usuarioId, {
                    attributes: ["id", "nome"],
                    transaction
                }),
                Curtida.count({ where: { postagemId: id }, transaction }),
                Comentario.count({
                    where: { postagemId: id, ativo: true },
                    transaction
                }),
                PostagemAnexo.findAll({
                    where: { postagemId: id },
                    attributes: ["tipo"],
                    transaction
                })
            ]);

            const midiaPorTipo = anexos.reduce((mapa, anexo) => {
                mapa[anexo.tipo] = (mapa[anexo.tipo] || 0) + 1;
                return mapa;
            }, {});

            const snapshot = {
                id: postagem.id,
                autorId: postagem.usuarioId,
                nomeAutor: autor?.nome ?? null,
                conteudo: postagem.conteudo,
                midiaPorTipo,
                totalAnexos: anexos.length,
                totalCurtidas,
                totalComentarios,
                publica: postagem.publica,
                criadaEm: postagem.createdAt
            };

            await postagem.update({ ativo: false }, { transaction });

            await AdminAuditService.log(
                {
                    adminId: solicitante.id,
                    acao: "REMOVER_POSTAGEM",
                    entidadeTipo: "postagem",
                    entidadeId: postagem.id,
                    descricao: descreverRemocaoPostagem(solicitante, snapshot),
                    metadata: {
                        before: { ativo: true },
                        after: { ativo: false },
                        snapshot
                    },
                    ip: contexto.ip,
                    userAgent: contexto.userAgent
                },
                { transaction }
            );

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        // Fora da transação, best-effort — `NotificacaoService.criar` já
        // nunca lança (ver comentário no próprio serviço); uma falha aqui
        // não pode desfazer uma remoção já commitada.
        await NotificacaoService.criar({
            usuarioId: postagem.usuarioId,
            tipo: "Feed",
            titulo: "Publicação removida",
            descricao:
                "Sua publicação foi removida pela moderação por violar as diretrizes da comunidade."
        });

        return { mensagem: "Postagem removida pela moderação." };
    }

    /** Mesmo padrão de `removerPostagem`, ver comentário acima. */
    async removerComentario(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let comentario;

        try {
            comentario = await Comentario.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!comentario) {
                throw ApiError.notFound("Comentário não encontrado.");
            }

            if (!comentario.ativo) {
                throw ApiError.conflict("Este comentário já foi removido.");
            }

            const [autor, postagemRelacionada] = await Promise.all([
                Usuario.findByPk(comentario.usuarioId, {
                    attributes: ["id", "nome"],
                    transaction
                }),
                Postagem.findByPk(comentario.postagemId, {
                    attributes: ["id", "usuarioId"],
                    transaction
                })
            ]);

            const autorPostagem = postagemRelacionada
                ? await Usuario.findByPk(postagemRelacionada.usuarioId, {
                      attributes: ["id", "nome"],
                      transaction
                  })
                : null;

            const snapshot = {
                id: comentario.id,
                autorId: comentario.usuarioId,
                nomeAutor: autor?.nome ?? null,
                conteudo: comentario.comentario,
                postagemId: comentario.postagemId,
                autorPostagemId: postagemRelacionada?.usuarioId ?? null,
                nomeAutorPostagem: autorPostagem?.nome ?? null,
                criadaEm: comentario.createdAt
            };

            await comentario.update({ ativo: false }, { transaction });

            await AdminAuditService.log(
                {
                    adminId: solicitante.id,
                    acao: "REMOVER_COMENTARIO",
                    entidadeTipo: "comentario",
                    entidadeId: comentario.id,
                    descricao: descreverRemocaoComentario(solicitante, snapshot),
                    metadata: {
                        before: { ativo: true },
                        after: { ativo: false },
                        snapshot
                    },
                    ip: contexto.ip,
                    userAgent: contexto.userAgent
                },
                { transaction }
            );

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        await NotificacaoService.criar({
            usuarioId: comentario.usuarioId,
            tipo: "Feed",
            titulo: "Comentário removido",
            descricao: "Seu comentário foi removido pela moderação por violar as diretrizes da comunidade.",
            subtipo: "comentario_removido_moderacao"
        });

        return { mensagem: "Comentário removido com sucesso." };
    }

    async listarVagas(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Vaga.findAndCountAll({
            include: [
                {
                    model: Empresa,
                    as: "empresa",
                    attributes: ["id", "nomeFantasia", "statusAprovacao"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("vagas", rows, count, pagina, limite);
    }

    async alternarVisibilidadeVaga(id, oculta, solicitante, contexto = {}) {
        const vaga = await Vaga.findByPk(id, {
            include: [{ model: Empresa, as: "empresa" }]
        });

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
        }

        const estadoAnterior = { oculta: vaga.oculta };
        const novoOculta = Boolean(oculta);

        await vaga.update({ oculta: novoOculta });

        await NotificacaoService.criar({
            usuarioId: vaga.empresa.usuarioId,
            tipo: "Vaga",
            titulo: novoOculta ? "Vaga ocultada pela moderação" : "Vaga voltou a ficar visível",
            descricao: novoOculta
                ? `Sua vaga "${vaga.titulo}" foi ocultada pela moderação e não aparece mais nas buscas.`
                : `Sua vaga "${vaga.titulo}" voltou a ficar visível para candidatos.`,
            subtipo: novoOculta ? "vaga_oculta_moderacao" : "vaga_reexibida_moderacao",
            entidadeTipo: "vaga",
            entidadeId: vaga.id
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: novoOculta ? "OCULTAR_VAGA" : "REEXIBIR_VAGA",
            entidadeTipo: "vaga",
            entidadeId: vaga.id,
            descricao: novoOculta
                ? `Vaga "${vaga.titulo}" foi ocultada pela moderação.`
                : `Vaga "${vaga.titulo}" voltou a ficar visível.`,
            metadata: {
                before: estadoAnterior,
                after: { oculta: novoOculta }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return { id: vaga.id, oculta: vaga.oculta };
    }
}

export default new AdminConteudoService();
