import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Usuario,
    Postagem,
    Comentario,
    Vaga,
    Empresa,
    Mensagem,
    Denuncia
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";
import AdminService from "./AdminService.js";
import ConversaService from "./ConversaService.js";

const INCLUDE_PARTES = [
    { model: Usuario, as: "denunciante", attributes: ["id", "nome", "email"] },
    { model: Usuario, as: "adminResponsavel", attributes: ["id", "nome"] }
];

/**
 * Ação de moderação automática aceita ao resolver uma denúncia, por
 * entidade_tipo. "mensagem" não tem entrada aqui de propósito: não
 * existe mecanismo de remoção de mensagem individual no schema — uma
 * denúncia de mensagem só pode ser resolvida/rejeitada/arquivada sem
 * ação, com o contexto consultável via obterContextoMensagem().
 */
const ACAO_MODERACAO_POR_TIPO = {
    usuario: "bloquear",
    postagem: "remover",
    comentario: "remover",
    vaga: "ocultar",
    empresa: "suspender"
};

/**
 * Denúncias — tabela única polimórfica (migration 0020).
 *
 * Resolver uma denúncia pode, opcionalmente, disparar a ação de
 * moderação real correspondente — sempre reaproveitando os métodos já
 * existentes do AdminService (nunca duplicando a lógica, nunca pulando
 * a proteção ADMIN->ADMIN). A ação executa ANTES da denúncia ser
 * marcada como resolvida: se a ação falhar, a denúncia permanece
 * intocada (nunca fica "parcialmente resolvida").
 */
class DenunciaService {
    /* ==========================================================
       VALIDAÇÃO DA ENTIDADE DENUNCIADA
    ========================================================== */

    /**
     * Confirma que a entidade denunciada existe e retorna o dono dela
     * (para a checagem de autodenúncia). Para mensagens, também garante
     * que o denunciante é participante da conversa — ninguém pode
     * denunciar uma mensagem de uma conversa que não é sua.
     */
    async resolverEntidadeDenunciada(entidadeTipo, entidadeId, denunciante) {
        switch (entidadeTipo) {
            case "usuario": {
                const usuario = await Usuario.findByPk(entidadeId, {
                    attributes: ["id"]
                });
                if (!usuario) {
                    throw ApiError.notFound("Usuário não encontrado.");
                }
                return { donoId: usuario.id };
            }

            case "postagem": {
                const postagem = await Postagem.findByPk(entidadeId, {
                    attributes: ["id", "usuarioId"]
                });
                if (!postagem) {
                    throw ApiError.notFound("Postagem não encontrada.");
                }
                return { donoId: postagem.usuarioId };
            }

            case "comentario": {
                const comentario = await Comentario.findByPk(entidadeId, {
                    attributes: ["id", "usuarioId"]
                });
                if (!comentario) {
                    throw ApiError.notFound("Comentário não encontrado.");
                }
                return { donoId: comentario.usuarioId };
            }

            case "vaga": {
                const vaga = await Vaga.findByPk(entidadeId, {
                    attributes: ["id"],
                    include: [
                        { model: Empresa, as: "empresa", attributes: ["usuarioId"] }
                    ]
                });
                if (!vaga) {
                    throw ApiError.notFound("Vaga não encontrada.");
                }
                return { donoId: vaga.empresa?.usuarioId ?? null };
            }

            case "empresa": {
                const empresa = await Empresa.findByPk(entidadeId, {
                    attributes: ["id", "usuarioId"]
                });
                if (!empresa) {
                    throw ApiError.notFound("Empresa não encontrada.");
                }
                return { donoId: empresa.usuarioId };
            }

            case "mensagem": {
                const mensagem = await Mensagem.findByPk(entidadeId, {
                    attributes: ["id", "conversaId", "remetenteId"]
                });
                if (!mensagem) {
                    throw ApiError.notFound("Mensagem não encontrada.");
                }

                const conversa = await ConversaService.carregarConversa(
                    mensagem.conversaId
                );
                ConversaService.garantirParticipante(conversa, denunciante);

                return { donoId: mensagem.remetenteId };
            }

            default:
                throw ApiError.badRequest("Tipo de entidade inválido.");
        }
    }

    /* ==========================================================
       CRIAÇÃO (qualquer usuário autenticado)
    ========================================================== */
    async criar({ entidadeTipo, entidadeId, motivo, descricao }, denunciante) {
        const { donoId } = await this.resolverEntidadeDenunciada(
            entidadeTipo,
            entidadeId,
            denunciante
        );

        if (donoId && String(donoId) === String(denunciante.id)) {
            throw ApiError.badRequest(
                "Você não pode denunciar seu próprio conteúdo."
            );
        }

        try {
            return await Denuncia.create({
                denuncianteId: denunciante.id,
                entidadeTipo,
                entidadeId,
                motivo,
                descricao: descricao || null
            });
        } catch (erro) {
            if (erro.name === "SequelizeUniqueConstraintError") {
                throw ApiError.conflict(
                    "Você já denunciou isso e a denúncia ainda está em análise."
                );
            }
            throw erro;
        }
    }

    /* ==========================================================
       FILA ADMINISTRATIVA
    ========================================================== */
    async listar(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};
        if (query.status) where.status = query.status;
        if (query.entidadeTipo) where.entidadeTipo = query.entidadeTipo;
        if (query.motivo) where.motivo = query.motivo;
        if (query.entidadeId) where.entidadeId = query.entidadeId;

        const { rows, count } = await Denuncia.findAndCountAll({
            where,
            include: INCLUDE_PARTES,
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("denuncias", rows, count, pagina, limite);
    }

    /**
     * Prévia mínima da entidade denunciada, só para dar contexto ao admin
     * na tela de detalhe. Mensagens nunca retornam conteúdo aqui — o
     * acesso ao conteúdo de uma mensagem denunciada é restrito ao fluxo
     * específico da Fase G, não a este endpoint genérico.
     */
    async carregarPreviaEntidade(entidadeTipo, entidadeId) {
        switch (entidadeTipo) {
            case "usuario": {
                const usuario = await Usuario.findByPk(entidadeId, {
                    attributes: ["id", "nome", "email", "tipoUsuario", "bloqueado"]
                });
                return usuario;
            }
            case "postagem": {
                const postagem = await Postagem.findByPk(entidadeId, {
                    attributes: ["id", "conteudo", "ativo", "usuarioId"]
                });
                return postagem;
            }
            case "comentario": {
                const comentario = await Comentario.findByPk(entidadeId, {
                    attributes: ["id", "comentario", "ativo", "usuarioId"]
                });
                return comentario;
            }
            case "vaga": {
                const vaga = await Vaga.findByPk(entidadeId, {
                    attributes: ["id", "titulo", "status", "oculta", "empresaId"]
                });
                return vaga;
            }
            case "empresa": {
                const empresa = await Empresa.findByPk(entidadeId, {
                    attributes: [
                        "id",
                        "razaoSocial",
                        "nomeFantasia",
                        "statusAprovacao"
                    ]
                });
                return empresa;
            }
            case "mensagem":
                return null;
            default:
                return null;
        }
    }

    async detalhe(id) {
        const denuncia = await Denuncia.findByPk(id, {
            include: INCLUDE_PARTES
        });

        if (!denuncia) {
            throw ApiError.notFound("Denúncia não encontrada.");
        }

        const previaEntidade = await this.carregarPreviaEntidade(
            denuncia.entidadeTipo,
            denuncia.entidadeId
        );

        return { ...denuncia.toJSON(), previaEntidade };
    }

    /* ==========================================================
       TRANSIÇÕES DE STATUS
    ========================================================== */
    garantirTransitavel(denuncia) {
        if (!["pendente", "em_analise"].includes(denuncia.status)) {
            throw ApiError.conflict(
                "Esta denúncia já foi encerrada e não pode ser alterada."
            );
        }
    }

    async atribuir(id, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ApiError.notFound("Denúncia não encontrada.");
        }

        this.garantirTransitavel(denuncia);

        await denuncia.update({
            status: "em_analise",
            adminResponsavelId: solicitante.id
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "ASSIGN_REPORT",
            entidadeTipo: "denuncia",
            entidadeId: denuncia.id,
            descricao: `Denúncia atribuída a ${solicitante.nome}.`,
            metadata: {
                entidadeDenunciada: {
                    tipo: denuncia.entidadeTipo,
                    id: denuncia.entidadeId
                }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return denuncia;
    }

    /**
     * Executa a ação de moderação real correspondente à denúncia,
     * reaproveitando o método já existente do AdminService — nunca
     * duplica a lógica de bloqueio/remoção/suspensão nem a proteção
     * ADMIN->ADMIN (ela já vive dentro de cada método reaproveitado).
     */
    async executarAcaoModeracao(denuncia, acao, observacao, solicitante, contexto) {
        const acaoEsperada = ACAO_MODERACAO_POR_TIPO[denuncia.entidadeTipo];

        if (!acaoEsperada || acaoEsperada !== acao) {
            throw ApiError.badRequest(
                `Ação "${acao}" não é válida para denúncias do tipo "${denuncia.entidadeTipo}".`
            );
        }

        switch (denuncia.entidadeTipo) {
            case "usuario":
                await AdminService.alternarBloqueio(
                    denuncia.entidadeId,
                    { bloqueado: true, motivo: observacao },
                    solicitante,
                    contexto
                );
                break;

            case "postagem":
                await AdminService.removerPostagem(
                    denuncia.entidadeId,
                    solicitante,
                    contexto
                );
                break;

            case "comentario":
                await AdminService.removerComentario(
                    denuncia.entidadeId,
                    solicitante,
                    contexto
                );
                break;

            case "vaga":
                await AdminService.alternarVisibilidadeVaga(
                    denuncia.entidadeId,
                    true,
                    solicitante,
                    contexto
                );
                break;

            case "empresa":
                await AdminService.suspenderEmpresa(
                    denuncia.entidadeId,
                    { motivo: observacao },
                    solicitante,
                    contexto
                );
                break;

            default:
                throw ApiError.badRequest(
                    "Esta denúncia não aceita uma ação automática de moderação."
                );
        }
    }

    async finalizar(
        denuncia,
        novoStatus,
        acaoAuditoria,
        observacao,
        solicitante,
        contexto = {},
        metadataExtra = {}
    ) {
        await denuncia.update({
            status: novoStatus,
            observacaoAdmin: observacao || null,
            resolvidoEm: new Date(),
            adminResponsavelId: denuncia.adminResponsavelId ?? solicitante.id
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: acaoAuditoria,
            entidadeTipo: "denuncia",
            entidadeId: denuncia.id,
            descricao: `Denúncia marcada como ${novoStatus}.`,
            metadata: {
                entidadeDenunciada: {
                    tipo: denuncia.entidadeTipo,
                    id: denuncia.entidadeId
                },
                observacao: observacao || null,
                ...metadataExtra
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        if (novoStatus === "resolvida" || novoStatus === "rejeitada") {
            await NotificacaoService.criar({
                usuarioId: denuncia.denuncianteId,
                tipo: "Moderacao",
                titulo: "Denúncia analisada",
                descricao:
                    novoStatus === "resolvida"
                        ? "Sua denúncia foi analisada e uma ação foi tomada pela nossa equipe."
                        : "Sua denúncia foi analisada e não identificamos violação das diretrizes da comunidade."
            });
        }

        return denuncia;
    }

    async resolver(id, { observacao, acao }, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ApiError.notFound("Denúncia não encontrada.");
        }

        this.garantirTransitavel(denuncia);

        if (acao) {
            await this.executarAcaoModeracao(
                denuncia,
                acao,
                observacao,
                solicitante,
                contexto
            );
        }

        return this.finalizar(
            denuncia,
            "resolvida",
            "RESOLVE_REPORT",
            observacao,
            solicitante,
            contexto,
            acao ? { acaoTomada: acao } : {}
        );
    }

    async rejeitar(id, { observacao }, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ApiError.notFound("Denúncia não encontrada.");
        }

        this.garantirTransitavel(denuncia);

        return this.finalizar(
            denuncia,
            "rejeitada",
            "REJECT_REPORT",
            observacao,
            solicitante,
            contexto
        );
    }

    async arquivar(id, { observacao }, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ApiError.notFound("Denúncia não encontrada.");
        }

        this.garantirTransitavel(denuncia);

        return this.finalizar(
            denuncia,
            "arquivada",
            "ARCHIVE_REPORT",
            observacao,
            solicitante,
            contexto
        );
    }

    /* ==========================================================
       CONTEXTO DE MENSAGEM (só para denúncias de mensagem)
    ========================================================== */

    /**
     * Retorna a mensagem denunciada + até 3 mensagens antes e até 3
     * depois, na mesma conversa. Só funciona para denúncias com
     * entidade_tipo === "mensagem" — verificado ANTES de tocar em
     * qualquer conteúdo. Todo acesso gera um log VIEW_REPORTED_MESSAGE,
     * mesmo que o admin não tome nenhuma ação depois: ler o conteúdo de
     * uma conversa privada é, em si, uma ação sensível.
     *
     * Este é o ÚNICO caminho de acesso a conteúdo de mensagem no painel
     * administrativo — não existe (e não deve existir) um endpoint de
     * busca livre de mensagens/conversas.
     */
    async obterContextoMensagem(id, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ApiError.notFound("Denúncia não encontrada.");
        }

        if (denuncia.entidadeTipo !== "mensagem") {
            throw ApiError.badRequest(
                "Esta denúncia não é sobre uma mensagem."
            );
        }

        const mensagem = await Mensagem.findByPk(denuncia.entidadeId);

        if (!mensagem) {
            throw ApiError.notFound("Mensagem denunciada não encontrada.");
        }

        // Comparação feita inteiramente dentro do Postgres (subquery pelo
        // próprio id, nunca por um valor de data que passou por JS): a
        // coluna created_at de "mensagens" é TIMESTAMP WITHOUT TIME ZONE,
        // e o driver pg interpreta esse tipo usando o fuso horário local
        // do processo Node ao converter para Date — em produção o servidor
        // roda em UTC, mas localmente (fuso diferente de UTC) isso desloca
        // o valor e quebra qualquer comparação feita com esse Date em JS.
        const referenciaCreatedAt = sequelize.literal(
            `(SELECT created_at FROM mensagens WHERE id = ${sequelize.escape(mensagem.id)})`
        );

        const [antes, depois] = await Promise.all([
            Mensagem.findAll({
                where: {
                    conversaId: mensagem.conversaId,
                    created_at: { [Op.lt]: referenciaCreatedAt }
                },
                order: [["created_at", "DESC"]],
                limit: 3
            }),
            Mensagem.findAll({
                where: {
                    conversaId: mensagem.conversaId,
                    created_at: { [Op.gt]: referenciaCreatedAt }
                },
                order: [["created_at", "ASC"]],
                limit: 3
            })
        ]);

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "VIEW_REPORTED_MESSAGE",
            entidadeTipo: "denuncia",
            entidadeId: denuncia.id,
            descricao: "Contexto de mensagem denunciada consultado.",
            metadata: {
                mensagemId: mensagem.id,
                conversaId: mensagem.conversaId
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return {
            mensagemDenunciada: mensagem,
            antes: antes.reverse(),
            depois
        };
    }
}

export default new DenunciaService();
