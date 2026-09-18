import { Op } from "sequelize";

import sequelize from "../config/bancoDeDados.js";
import {
    Usuario,
    Empresa,
    Vaga,
    Postagem,
    PostagemAnexo,
    Comentario,
    Curtida
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import PostagemService from "./PostagemService.js";

/**
 * Nomes legíveis (singular e plural) por tipo de anexo, só para compor a frase do log de auditoria.
 * Os mesmos 3 valores do ENUM de `PostagemAnexo.tipo`.
 */
const NOMES_TIPO_ANEXO = {
    imagem: ["imagem", "imagens"],
    video: ["vídeo", "vídeos"],
    documento: ["documento", "documentos"]
};

const pluralizar = (quantidade, singular, plural) =>
    `${quantidade} ${quantidade === 1 ? singular : plural}`;

/**
 * Monta a descrição do log de "remover postagem" a partir do retrato capturado antes da remoção,
 * sem consultar a postagem de novo (ela pode não existir quando o log for lido). Exemplo: "Pedro
 * Lima removeu uma publicação de João Silva. A publicação continha: texto; 1 imagem; 12 curtidas; 3
 * comentários."
 */
function descreverRemocaoPostagem(admin, retrato) {
    const partesConteudo = [];

    if (retrato.conteudo && retrato.conteudo.trim()) {
        partesConteudo.push("texto");
    }

    for (const [tipo, quantidade] of Object.entries(retrato.midiaPorTipo || {})) {
        const [singular, plural] = NOMES_TIPO_ANEXO[tipo] || [tipo, tipo];
        partesConteudo.push(pluralizar(quantidade, singular, plural));
    }

    if (partesConteudo.length === 0) {
        partesConteudo.push("nenhum conteúdo registrado");
    }

    return (
        `${admin.nome} removeu uma publicação de ${retrato.nomeAutor ?? "um usuário removido"}. ` +
        `A publicação continha: ${partesConteudo.join("; ")}; ` +
        `${pluralizar(retrato.totalCurtidas, "curtida", "curtidas")}; ` +
        `${pluralizar(retrato.totalComentarios, "comentário", "comentários")}.`
    );
}

/**
 * Mesma lógica para "remover comentário". Exemplo: "Pedro Lima removeu
 * um comentário de João Silva em uma publicação de Maria Souza."
 */
function descreverRemocaoComentario(admin, retrato) {
    return (
        `${admin.nome} removeu um comentário de ${retrato.nomeAutor ?? "um usuário removido"} ` +
        `em uma publicação de ${retrato.nomeAutorPostagem ?? "um usuário removido"}.`
    );
}

/**
 * Painel administrativo: moderação de conteúdo do feed (postagens,
 * comentários) e visibilidade de vagas.
 *
 * Todas as rotas que chegam aqui já passaram por autenticacaoMiddleware +
 * exigirTipoUsuarioMiddleware("administrador"); ainda assim os métodos nunca
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
                // Sem os anexos aqui, `PostagemService.decorar` (via `assinarMidiaDasPostagens`) não
                // teria o que assinar; `BuscaService` e `PublicoService` têm o mesmo cuidado.
                {
                    model: PostagemAnexo,
                    as: "anexos",
                    attributes: ["id", "url", "tipo", "descricao"],
                    separate: true
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["criadoEm", "DESC"]]
        });

        // Usa a mesma decoração do feed (contadores de curtidas e comentários e URLs de mídia
        // assinadas), sem duplicar a lógica de Storage. `solicitante: null` só afeta
        // `curtidoPorMim`, que não importa no painel administrativo.
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
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("comentarios", rows, count, pagina, limite);
    }

    /**
     * Remoção idempotente: trava a linha e confere `ativo === true` dentro da transação, como
     * `AdminUsuarioService.excluirContaDefinitivamente`. Uma segunda chamada para a mesma postagem
     * (clique duplo, retry de rede) encontra `ativo: false` e recebe 409, sem duplicar notificação
     * nem log.
     *
     * O retrato é capturado antes do `update`, dentro da transação, e vai para
     * `metadados.retrato`, sem dado pessoal além do nome do autor (nada de e-mail, CPF ou CNPJ). É
     * a única fonte usada para descrever o log depois, mesmo que a postagem, ou a conta do autor
     * (CASCADE de `postagens.usuario_id`), deixe de existir.
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
                throw ErroApi.naoEncontrado("Postagem não encontrada.");
            }

            if (!postagem.ativo) {
                throw ErroApi.conflito("Esta publicação já foi removida.");
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

            const retrato = {
                id: postagem.id,
                autorId: postagem.usuarioId,
                nomeAutor: autor?.nome ?? null,
                conteudo: postagem.conteudo,
                midiaPorTipo,
                totalAnexos: anexos.length,
                totalCurtidas,
                totalComentarios,
                publica: postagem.publica,
                criadaEm: postagem.criadoEm
            };

            await postagem.update({ ativo: false }, { transaction });

            await AdminAuditoriaService.registrar(
                {
                    administradorId: solicitante.id,
                    acao: "remover_postagem",
                    entidadeTipo: "postagem",
                    entidadeId: postagem.id,
                    descricao: descreverRemocaoPostagem(solicitante, retrato),
                    metadados: {
                        antes: { ativo: true },
                        depois: { ativo: false },
                        retrato
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

        // Fora da transação, best-effort: `NotificacaoService.criar` já
        // nunca lança (ver comentário no próprio serviço); uma falha aqui
        // não pode desfazer uma remoção já commitada.
        await NotificacaoService.criar({
            usuarioId: postagem.usuarioId,
            tipo: "feed",
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
                throw ErroApi.naoEncontrado("Comentário não encontrado.");
            }

            if (!comentario.ativo) {
                throw ErroApi.conflito("Este comentário já foi removido.");
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

            const retrato = {
                id: comentario.id,
                autorId: comentario.usuarioId,
                nomeAutor: autor?.nome ?? null,
                conteudo: comentario.comentario,
                postagemId: comentario.postagemId,
                autorPostagemId: postagemRelacionada?.usuarioId ?? null,
                nomeAutorPostagem: autorPostagem?.nome ?? null,
                criadaEm: comentario.criadoEm
            };

            await comentario.update({ ativo: false }, { transaction });

            await AdminAuditoriaService.registrar(
                {
                    administradorId: solicitante.id,
                    acao: "remover_comentario",
                    entidadeTipo: "comentario",
                    entidadeId: comentario.id,
                    descricao: descreverRemocaoComentario(solicitante, retrato),
                    metadados: {
                        antes: { ativo: true },
                        depois: { ativo: false },
                        retrato
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
            tipo: "feed",
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
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("vagas", rows, count, pagina, limite);
    }

    async alternarVisibilidadeVaga(id, oculta, solicitante, contexto = {}) {
        const vaga = await Vaga.findByPk(id, {
            include: [{ model: Empresa, as: "empresa" }]
        });

        if (!vaga) {
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        const estadoAnterior = { oculta: vaga.oculta };
        const novoOculta = Boolean(oculta);

        await vaga.update({ oculta: novoOculta });

        await NotificacaoService.criar({
            usuarioId: vaga.empresa.usuarioId,
            tipo: "vaga",
            titulo: novoOculta ? "Vaga ocultada pela moderação" : "Vaga voltou a ficar visível",
            descricao: novoOculta
                ? `Sua vaga "${vaga.titulo}" foi ocultada pela moderação e não aparece mais nas buscas.`
                : `Sua vaga "${vaga.titulo}" voltou a ficar visível para candidatos.`,
            subtipo: novoOculta ? "vaga_oculta_moderacao" : "vaga_reexibida_moderacao",
            entidadeTipo: "vaga",
            entidadeId: vaga.id
        });

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: novoOculta ? "ocultar_vaga" : "reexibir_vaga",
            entidadeTipo: "vaga",
            entidadeId: vaga.id,
            descricao: novoOculta
                ? `Vaga "${vaga.titulo}" foi ocultada pela moderação.`
                : `Vaga "${vaga.titulo}" voltou a ficar visível.`,
            metadados: {
                antes: estadoAnterior,
                depois: { oculta: novoOculta }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return { id: vaga.id, oculta: vaga.oculta };
    }
}

export default new AdminConteudoService();
