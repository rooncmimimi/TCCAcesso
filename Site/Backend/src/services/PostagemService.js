import { Op } from "sequelize";

import sequelize from "../config/database.js";
import {
    Postagem,
    Usuario,
    Empresa,
    Comentario,
    Curtida,
    PostagemAnexo,
    Compartilhamento,
    UsuarioSeguido
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, garantirEmpresaAprovada, ehAdministrador } from "../utils/authorization.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";
import { emitirFeed } from "../realtime/socket.js";
import { urlPublica, tipoDoArquivo } from "../middlewares/uploadMiddleware.js";

/**
 * O Sequelize muta os objetos de `include` (grava associação/alias neles),
 * portanto o MESMO objeto não pode ser reutilizado em níveis diferentes de
 * aninhamento — isso gerava SQL inválido ("missing FROM-clause entry").
 * Por isso cada include é criado por uma fábrica que devolve um objeto novo.
 */
const incluirAutor = () => ({
    model: Usuario,
    as: "usuario",
    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
});

const incluirAnexos = () => ({
    model: PostagemAnexo,
    as: "anexos",
    separate: true,
    order: [["ordem", "ASC"]]
});

class PostagemService {
    async buscarAtiva(id, transaction) {
        const postagem = await Postagem.findByPk(id, { transaction });

        if (!postagem || !postagem.ativo) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        return postagem;
    }

    /**
     * Contadores reais (curtidas, comentários, compartilhamentos) e o
     * estado do usuário autenticado para cada postagem.
     */
    async decorar(postagens, solicitante) {
        const lista = Array.isArray(postagens) ? postagens : [postagens];

        if (lista.length === 0) {
            return [];
        }

        const ids = lista.map((item) => item.id);

        const [curtidas, comentarios, compartilhamentos] = await Promise.all([
            Curtida.findAll({
                where: { postagemId: { [Op.in]: ids } },
                attributes: ["postagemId", "usuarioId"]
            }),
            Comentario.count({
                where: { postagemId: { [Op.in]: ids }, ativo: true },
                group: ["postagem_id"]
            }),
            Compartilhamento.count({
                where: { postagemId: { [Op.in]: ids } },
                group: ["postagem_id"]
            })
        ]);

        const mapaContagem = (linhas) => {
            const mapa = new Map();

            (linhas || []).forEach((linha) => {
                mapa.set(
                    linha.postagem_id || linha.postagemId,
                    Number(linha.count)
                );
            });

            return mapa;
        };

        const totalComentarios = mapaContagem(comentarios);
        const totalCompartilhamentos = mapaContagem(compartilhamentos);

        return lista.map((postagem) => {
            const dados = postagem.toJSON ? postagem.toJSON() : postagem;

            const curtidasDaPostagem = curtidas.filter(
                (curtida) => String(curtida.postagemId) === String(dados.id)
            );

            return {
                ...dados,
                totalCurtidas: curtidasDaPostagem.length,
                curtidoPorMim: solicitante
                    ? curtidasDaPostagem.some(
                          (curtida) =>
                              String(curtida.usuarioId) ===
                              String(solicitante.id)
                      )
                    : false,
                totalComentarios: totalComentarios.get(dados.id) || 0,
                totalCompartilhamentos:
                    totalCompartilhamentos.get(dados.id) || 0
            };
        });
    }

    /* ==========================================================
       FEED (autenticado) — prioriza quem o usuário segue
    ========================================================== */
    async findAll(query, solicitante) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };

        if (query.usuarioId) {
            where.usuarioId = query.usuarioId;
        }

        if (query.escopo === "seguindo" && solicitante) {
            const vinculos = await UsuarioSeguido.findAll({
                where: { seguidorId: solicitante.id },
                attributes: ["seguidoId"]
            });

            where.usuarioId = {
                [Op.in]: [
                    ...vinculos.map((item) => item.seguidoId),
                    solicitante.id
                ]
            };
        }

        if (query.q) {
            where.conteudo = {
                [Op.iLike]: `%${String(query.q).slice(0, 120)}%`
            };
        }

        const { rows, count } = await Postagem.findAndCountAll({
            where,
            include: [incluirAutor(), incluirAnexos()],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        const postagens = await this.decorar(rows, solicitante);

        return montarResposta("postagens", postagens, count, pagina, limite);
    }

    /* ==========================================================
       DETALHE COM COMENTÁRIOS EM ÁRVORE
    ========================================================== */
    async findById(id, solicitante = null) {
        const postagem = await Postagem.findOne({
            where: { id, ativo: true },
            include: [
                incluirAutor(),
                incluirAnexos(),
                {
                    model: Comentario,
                    as: "comentarios",
                    where: { ativo: true, comentarioPaiId: null },
                    required: false,
                    include: [
                        incluirAutor(),
                        {
                            model: Comentario,
                            as: "respostas",
                            required: false,
                            where: { ativo: true },
                            include: [incluirAutor()]
                        }
                    ]
                }
            ],
            order: [[{ model: Comentario, as: "comentarios" }, "created_at", "ASC"]]
        });

        if (!postagem) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        const [decorada] = await this.decorar(postagem, solicitante);

        return decorada;
    }

    /* ==========================================================
       CRIAR (texto + até 4 anexos)
    ========================================================== */
    async create(data, solicitante, arquivos = []) {
        const conteudo = String(data.conteudo || "").trim();

        if (!conteudo && arquivos.length === 0) {
            throw ApiError.badRequest(
                "Escreva algo ou anexe um arquivo para publicar."
            );
        }

        if (solicitante.tipoUsuario === "empresa") {
            const empresa = await Empresa.findOne({
                where: { usuarioId: solicitante.id }
            });

            if (empresa) {
                garantirEmpresaAprovada(empresa, solicitante);
            }
        }

        const transaction = await sequelize.transaction();

        let postagem;

        try {
            const primeiraImagem = arquivos.find(
                (arquivo) => tipoDoArquivo(arquivo) === "imagem"
            );

            postagem = await Postagem.create(
                {
                    usuarioId: solicitante.id,
                    conteudo,
                    imagem: primeiraImagem ? urlPublica(primeiraImagem) : null,
                    publica: data.publica === undefined ? true : Boolean(data.publica)
                },
                { transaction }
            );

            if (arquivos.length > 0) {
                await PostagemAnexo.bulkCreate(
                    arquivos.map((arquivo, indice) => ({
                        postagemId: postagem.id,
                        tipo: tipoDoArquivo(arquivo),
                        url: urlPublica(arquivo),
                        nomeOriginal: arquivo.originalname?.slice(0, 255),
                        mimeType: arquivo.mimetype,
                        tamanhoBytes: arquivo.size,
                        ordem: indice
                    })),
                    { transaction }
                );
            }

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        // Fora da transação: uma falha aqui não pode disparar rollback
        // de uma transação já confirmada.
        const criada = await this.findById(postagem.id, solicitante);

        emitirFeed("feed:postagem", { postagem: criada });

        return criada;
    }



    /* ==========================================================
       ATUALIZAR (autor ou admin)
    ========================================================== */
    async update(id, data, solicitante) {
        const postagem = await this.buscarAtiva(id);

        garantirDono(solicitante, postagem.usuarioId);

        await postagem.update({
            conteudo: data.conteudo ?? postagem.conteudo,
            publica:
                data.publica === undefined
                    ? postagem.publica
                    : Boolean(data.publica),
            editadoEm: new Date()
        });

        const atualizada = await this.findById(id, solicitante);

        emitirFeed("feed:postagem", { postagem: atualizada, atualizada: true });

        return atualizada;
    }

    /* ==========================================================
       REMOVER (soft delete via coluna "ativo")
    ========================================================== */
    async delete(id, solicitante, contexto = {}) {
        const postagem = await this.buscarAtiva(id);

        garantirDono(solicitante, postagem.usuarioId);

        const ehModeracao =
            ehAdministrador(solicitante) &&
            String(postagem.usuarioId) !== String(solicitante.id);

        postagem.ativo = false;
        await postagem.save();

        emitirFeed("feed:postagem", { id, removida: true });

        if (ehModeracao) {
            await AdminAuditService.log({
                adminId: solicitante.id,
                acao: "REMOVER_POSTAGEM",
                entidadeTipo: "postagem",
                entidadeId: postagem.id,
                descricao: "Postagem removida pela moderação.",
                metadata: {
                    before: { ativo: true },
                    after: { ativo: false },
                    autorId: postagem.usuarioId
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return { mensagem: "Postagem removida com sucesso." };
    }

    /* ==========================================================
       CURTIR / DESCURTIR (toggle idempotente)
    ========================================================== */
    async alternarCurtida(id, solicitante) {
        const postagem = await this.buscarAtiva(id);

        const existente = await Curtida.findOne({
            where: { postagemId: id, usuarioId: solicitante.id }
        });

        if (existente) {
            await existente.destroy();
        } else {
            await Curtida.create({
                postagemId: id,
                usuarioId: solicitante.id
            });

            if (String(postagem.usuarioId) !== String(solicitante.id)) {
                await NotificacaoService.criar({
                    usuarioId: postagem.usuarioId,
                    tipo: "Feed",
                    titulo: "Nova curtida na sua publicação",
                    descricao: `${solicitante.nome} curtiu sua publicação.`
                });
            }
        }

        const total = await Curtida.count({ where: { postagemId: id } });

        emitirFeed("feed:curtida", {
            postagemId: id,
            totalCurtidas: total
        });

        return { curtido: !existente, totalCurtidas: total };
    }

    /* ==========================================================
       COMENTÁRIOS
    ========================================================== */
    async comentar(id, comentario, solicitante, comentarioPaiId = null) {
        const postagem = await this.buscarAtiva(id);

        if (comentarioPaiId) {
            const pai = await Comentario.findByPk(comentarioPaiId);

            if (!pai || !pai.ativo || String(pai.postagemId) !== String(id)) {
                throw ApiError.notFound("Comentário respondido não encontrado.");
            }
        }

        const criado = await Comentario.create({
            postagemId: id,
            usuarioId: solicitante.id,
            comentario,
            comentarioPaiId
        });

        if (String(postagem.usuarioId) !== String(solicitante.id)) {
            await NotificacaoService.criar({
                usuarioId: postagem.usuarioId,
                tipo: "Feed",
                titulo: "Novo comentário na sua publicação",
                descricao: `${solicitante.nome} comentou: ${String(comentario).slice(0, 120)}`
            });
        }

        const total = await Comentario.count({
            where: { postagemId: id, ativo: true }
        });

        const completo = await Comentario.findByPk(criado.id, {
            include: [incluirAutor()]
        });

        emitirFeed("feed:comentario", {
            postagemId: id,
            comentario: completo,
            totalComentarios: total
        });

        return completo;
    }

    async removerComentario(comentarioId, solicitante, contexto = {}) {
        const comentario = await Comentario.findByPk(comentarioId);

        if (!comentario || !comentario.ativo) {
            throw ApiError.notFound("Comentário não encontrado.");
        }

        garantirDono(solicitante, comentario.usuarioId);

        const ehModeracao =
            ehAdministrador(solicitante) &&
            String(comentario.usuarioId) !== String(solicitante.id);

        comentario.ativo = false;
        await comentario.save();

        emitirFeed("feed:comentario", {
            postagemId: comentario.postagemId,
            comentarioId,
            removido: true,
            totalComentarios: await Comentario.count({
                where: { postagemId: comentario.postagemId, ativo: true }
            })
        });

        if (ehModeracao) {
            await AdminAuditService.log({
                adminId: solicitante.id,
                acao: "REMOVER_COMENTARIO",
                entidadeTipo: "comentario",
                entidadeId: comentario.id,
                descricao: "Comentário removido pela moderação.",
                metadata: {
                    before: { ativo: true },
                    after: { ativo: false },
                    autorId: comentario.usuarioId
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return { mensagem: "Comentário removido com sucesso." };
    }
}

export default new PostagemService();
