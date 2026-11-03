import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import {
    Usuario,
    Postagem,
    Comentario,
    Vaga,
    Empresa,
    Mensagem,
    Denuncia,
    RegistroAuditoria
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import AdminUsuarioService from "./AdminUsuarioService.js";
import AdminConteudoService from "./AdminConteudoService.js";
import AdminEmpresaService from "./AdminEmpresaService.js";
import ConversaService from "./ConversaService.js";

const INCLUDE_PARTES = [
    { model: Usuario, as: "denunciante", attributes: ["id", "nome", "email"] },
    { model: Usuario, as: "administradorResponsavel", attributes: ["id", "nome"] }
];

/**
 * Ação de moderação automática aceita ao resolver uma denúncia, por
 * entidade_tipo. "mensagem" não tem entrada aqui de propósito: não
 * existe mecanismo de remoção de mensagem individual no schema; uma
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
 * Denúncias: tabela única polimórfica. Resolver uma denúncia pode disparar,
 * opcionalmente, a ação de moderação correspondente, sempre pelos métodos que já existem nos
 * services administrativos de cada domínio (`AdminUsuarioService`, `AdminConteudoService`,
 * `AdminEmpresaService`), sem duplicar lógica e sem pular a proteção que impede ação administrativa
 * contra outro administrador. A ação roda antes de a denúncia ser marcada como resolvida: se
 * falhar, a denúncia fica intocada, nunca parcialmente resolvida.
 */
class DenunciaService {
    /* Validação da entidade denunciada */

    /**
     * Confirma que a entidade denunciada existe e retorna o dono dela
     * (para a checagem de autodenúncia). Para mensagens, também garante
     * que o denunciante é participante da conversa: ninguém pode
     * denunciar uma mensagem de uma conversa que não é sua.
     */
    async resolverEntidadeDenunciada(entidadeTipo, entidadeId, denunciante) {
        switch (entidadeTipo) {
            case "usuario": {
                const usuario = await Usuario.findByPk(entidadeId, {
                    attributes: ["id"]
                });
                if (!usuario) {
                    throw ErroApi.naoEncontrado("Usuário não encontrado.");
                }
                return { donoId: usuario.id };
            }

            case "postagem": {
                const postagem = await Postagem.findByPk(entidadeId, {
                    attributes: ["id", "usuarioId"]
                });
                if (!postagem) {
                    throw ErroApi.naoEncontrado("Postagem não encontrada.");
                }
                return { donoId: postagem.usuarioId };
            }

            case "comentario": {
                const comentario = await Comentario.findByPk(entidadeId, {
                    attributes: ["id", "usuarioId"]
                });
                if (!comentario) {
                    throw ErroApi.naoEncontrado("Comentário não encontrado.");
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
                    throw ErroApi.naoEncontrado("Vaga não encontrada.");
                }
                return { donoId: vaga.empresa?.usuarioId ?? null };
            }

            case "empresa": {
                const empresa = await Empresa.findByPk(entidadeId, {
                    attributes: ["id", "usuarioId"]
                });
                if (!empresa) {
                    throw ErroApi.naoEncontrado("Empresa não encontrada.");
                }
                return { donoId: empresa.usuarioId };
            }

            case "mensagem": {
                const mensagem = await Mensagem.findByPk(entidadeId, {
                    attributes: ["id", "conversaId", "remetenteId"]
                });
                if (!mensagem) {
                    throw ErroApi.naoEncontrado("Mensagem não encontrada.");
                }

                const conversa = await ConversaService.carregarConversa(
                    mensagem.conversaId
                );
                ConversaService.garantirParticipante(conversa, denunciante);

                return { donoId: mensagem.remetenteId };
            }

            default:
                throw ErroApi.requisicaoInvalida("Tipo de entidade inválido.");
        }
    }

    /* Criação (qualquer usuário autenticado) */
    async criar({ entidadeTipo, entidadeId, motivo, descricao }, denunciante) {
        const { donoId } = await this.resolverEntidadeDenunciada(
            entidadeTipo,
            entidadeId,
            denunciante
        );

        if (donoId && String(donoId) === String(denunciante.id)) {
            throw ErroApi.requisicaoInvalida(
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
                throw ErroApi.conflito(
                    "Você já denunciou isso e a denúncia ainda está em análise."
                );
            }
            throw erro;
        }
    }

    /* Fila administrativa */
    async listar(query, solicitante = null) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};
        // Responsável: "minhas" (as do administrador que pede) ou "sem_responsavel" (ninguém assumiu).
        if (query.atribuicao === "minhas" && solicitante?.id) where.administradorResponsavelId = solicitante.id;
        if (query.atribuicao === "sem_responsavel") where.administradorResponsavelId = null;
        if (query.status) where.status = query.status;
        if (query.entidadeTipo) where.entidadeTipo = query.entidadeTipo;
        if (query.motivo) where.motivo = query.motivo;
        if (query.entidadeId) where.entidadeId = query.entidadeId;

        const { rows, count } = await Denuncia.findAndCountAll({
            where,
            include: INCLUDE_PARTES,
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("denuncias", rows, count, pagina, limite);
    }

    /**
     * Prévia mínima da entidade denunciada, só para dar contexto ao administrador na tela de
     * detalhe. Mensagens nunca trazem conteúdo aqui: o conteúdo de uma mensagem denunciada só é
     * acessível por `obterContextoMensagem`.
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
                return this.comAutor(postagem);
            }
            case "comentario": {
                const comentario = await Comentario.findByPk(entidadeId, {
                    attributes: ["id", "comentario", "ativo", "usuarioId"]
                });
                return this.comAutor(comentario);
            }
            case "vaga": {
                const vaga = await Vaga.findByPk(entidadeId, {
                    attributes: ["id", "titulo", "status", "oculta", "empresaId"]
                });

                if (!vaga) return null;

                // Quem publicou a vaga, para a moderação saber de quem se trata sem abrir outra tela.
                const empresa = await Empresa.findByPk(vaga.empresaId, {
                    attributes: ["id", "razaoSocial", "nomeFantasia"]
                });

                return { ...vaga.toJSON(), empresa: empresa ? empresa.toJSON() : null };
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

    /** Acrescenta quem escreveu (nome e tipo de conta) a uma postagem ou comentário denunciado. */
    async comAutor(conteudo) {
        if (!conteudo) return null;

        const autor = await Usuario.findByPk(conteudo.usuarioId, {
            attributes: ["id", "nome", "tipoUsuario"]
        });

        return { ...conteudo.toJSON(), autor: autor ? autor.toJSON() : null };
    }

    /**
     * Histórico de tratamento: tudo o que a moderação fez nesta denúncia (assumir, resolver, rejeitar,
     * arquivar, abrir o contexto de uma mensagem), em ordem. Vem dos registros de auditoria que já são
     * gravados; só data, ação, descrição e quem agiu saem daqui, nunca IP nem metadados.
     */
    async historico(id) {
        const registros = await RegistroAuditoria.findAll({
            where: { entidadeTipo: "denuncia", entidadeId: id },
            attributes: ["id", "acao", "descricao", "criadoEm"],
            include: [{ model: Usuario, as: "administrador", attributes: ["id", "nome"] }],
            order: [["criadoEm", "ASC"]]
        });

        return registros.map((registro) => ({
            id: registro.id,
            acao: registro.acao,
            descricao: registro.descricao,
            criadoEm: registro.criadoEm,
            administrador: registro.administrador
                ? { id: registro.administrador.id, nome: registro.administrador.nome }
                : null
        }));
    }

    async detalhe(id) {
        const denuncia = await Denuncia.findByPk(id, {
            include: INCLUDE_PARTES
        });

        if (!denuncia) {
            throw ErroApi.naoEncontrado("Denúncia não encontrada.");
        }

        const [previaEntidade, historico] = await Promise.all([
            this.carregarPreviaEntidade(denuncia.entidadeTipo, denuncia.entidadeId),
            this.historico(denuncia.id)
        ]);

        return { ...denuncia.toJSON(), previaEntidade, historico };
    }

    /* Transições de status */
    garantirTransitavel(denuncia) {
        if (!["pendente", "em_analise"].includes(denuncia.status)) {
            throw ErroApi.conflito(
                "Esta denúncia já foi encerrada e não pode ser alterada."
            );
        }
    }

    /**
     * "Atribuir a mim": o administrador autenticado assume a denúncia.
     *
     * - Quem assume vem **sempre da sessão** (`solicitante`); a requisição não diz quem assume, então não há
     *   como atribuir a outra pessoa, muito menos a uma conta que não seja de administrador. Mesmo assim o
     *   serviço confere o tipo da conta, porque é ele que grava `administrador_responsavel_id`.
     * - Já é minha: nada muda e nada é registrado de novo (idempotente).
     * - Está com outro administrador: recusa com 409 dizendo quem é, a não ser que se confirme (`forcar`).
     *   Antes a atribuição de um colega era sobrescrita em silêncio, e dois cliques simultâneos terminavam
     *   com o último vencendo sem aviso.
     * - A leitura e a gravação ficam na mesma transação, com a linha travada, para duas pessoas não
     *   assumirem ao mesmo tempo.
     *
     * Devolve a denúncia já com o responsável, para a tela mostrar o resultado confirmado pela API.
     */
    async atribuir(id, solicitante, contexto = {}, { forcar = false } = {}) {
        if (solicitante?.tipoUsuario !== "administrador") {
            throw ErroApi.acessoNegado("Só um administrador pode assumir uma denúncia.");
        }

        const transaction = await sequelize.transaction();
        let anterior = null;
        let alterou = false;
        let denunciaEntidade;

        try {
            const denuncia = await Denuncia.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });

            if (!denuncia) {
                throw ErroApi.naoEncontrado("Denúncia não encontrada.");
            }

            this.garantirTransitavel(denuncia);

            denunciaEntidade = { tipo: denuncia.entidadeTipo, id: denuncia.entidadeId };
            anterior = denuncia.administradorResponsavelId;

            if (anterior !== solicitante.id) {
                if (anterior && !forcar) {
                    const outro = await Usuario.findByPk(anterior, { attributes: ["nome"], transaction });

                    throw ErroApi.conflito(
                        `Esta denúncia já está com ${outro?.nome ?? "outro administrador"}. Confirme para assumi-la.`
                    );
                }

                await denuncia.update(
                    { status: "em_analise", administradorResponsavelId: solicitante.id },
                    { transaction }
                );
                alterou = true;
            }

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        if (alterou) {
            await AdminAuditoriaService.registrar({
                administradorId: solicitante.id,
                acao: "atribuir_denuncia",
                entidadeTipo: "denuncia",
                entidadeId: id,
                descricao: anterior
                    ? `Denúncia assumida por ${solicitante.nome} (estava com outro administrador).`
                    : `Denúncia atribuída a ${solicitante.nome}.`,
                metadados: {
                    entidadeDenunciada: denunciaEntidade,
                    responsavelAnteriorId: anterior ?? null
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return Denuncia.findByPk(id, { include: INCLUDE_PARTES });
    }

    /**
     * Executa a ação de moderação correspondente à denúncia com o método que já existe no service
     * administrativo do domínio certo, sem duplicar a lógica de bloqueio, remoção ou suspensão nem
     * a proteção contra ação administrativa em outro administrador, que já fica dentro de cada
     * método reaproveitado.
     */
    async executarAcaoModeracao(denuncia, acao, observacao, solicitante, contexto) {
        const acaoEsperada = ACAO_MODERACAO_POR_TIPO[denuncia.entidadeTipo];

        if (!acaoEsperada || acaoEsperada !== acao) {
            throw ErroApi.requisicaoInvalida(
                `Ação "${acao}" não é válida para denúncias do tipo "${denuncia.entidadeTipo}".`
            );
        }

        switch (denuncia.entidadeTipo) {
            case "usuario":
                await AdminUsuarioService.alternarBloqueio(
                    denuncia.entidadeId,
                    { bloqueado: true, motivo: observacao },
                    solicitante,
                    contexto
                );
                break;

            case "postagem":
                await AdminConteudoService.removerPostagem(
                    denuncia.entidadeId,
                    solicitante,
                    contexto
                );
                break;

            case "comentario":
                await AdminConteudoService.removerComentario(
                    denuncia.entidadeId,
                    solicitante,
                    contexto
                );
                break;

            case "vaga":
                await AdminConteudoService.alternarVisibilidadeVaga(
                    denuncia.entidadeId,
                    true,
                    solicitante,
                    contexto
                );
                break;

            case "empresa":
                await AdminEmpresaService.suspenderEmpresa(
                    denuncia.entidadeId,
                    { motivo: observacao },
                    solicitante,
                    contexto
                );
                break;

            default:
                throw ErroApi.requisicaoInvalida(
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
            observacaoAdministrador: observacao || null,
            resolvidoEm: new Date(),
            administradorResponsavelId: denuncia.administradorResponsavelId ?? solicitante.id
        });

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: acaoAuditoria,
            entidadeTipo: "denuncia",
            entidadeId: denuncia.id,
            descricao: `Denúncia marcada como ${novoStatus}.`,
            metadados: {
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

        // Sem `denuncianteId`, quem denunciou excluiu a própria conta: a denúncia
        // continua existindo e pode ser resolvida, só não há ninguém para avisar do desfecho.
        if (
            (novoStatus === "resolvida" || novoStatus === "rejeitada") &&
            denuncia.denuncianteId
        ) {
            await NotificacaoService.criar({
                usuarioId: denuncia.denuncianteId,
                tipo: "moderacao",
                titulo: "Denúncia analisada",
                descricao:
                    novoStatus === "resolvida"
                        ? "Sua denúncia foi analisada e uma ação foi tomada pela nossa equipe."
                        : "Sua denúncia foi analisada e não identificamos violação das diretrizes da comunidade.",
                subtipo: novoStatus === "resolvida" ? "denuncia_resolvida" : "denuncia_rejeitada"
            });
        }

        return denuncia;
    }

    async resolver(id, { observacao, acao }, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ErroApi.naoEncontrado("Denúncia não encontrada.");
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
            "resolver_denuncia",
            observacao,
            solicitante,
            contexto,
            acao ? { acaoTomada: acao } : {}
        );
    }

    async rejeitar(id, { observacao }, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ErroApi.naoEncontrado("Denúncia não encontrada.");
        }

        this.garantirTransitavel(denuncia);

        return this.finalizar(
            denuncia,
            "rejeitada",
            "rejeitar_denuncia",
            observacao,
            solicitante,
            contexto
        );
    }

    async arquivar(id, { observacao }, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ErroApi.naoEncontrado("Denúncia não encontrada.");
        }

        this.garantirTransitavel(denuncia);

        return this.finalizar(
            denuncia,
            "arquivada",
            "arquivar_denuncia",
            observacao,
            solicitante,
            contexto
        );
    }

    /* Contexto de mensagem (só para denúncias de mensagem) */

    /**
     * Retorna a mensagem denunciada + até 3 mensagens antes e até 3
     * depois, na mesma conversa. Só funciona para denúncias com
     * entidade_tipo === "mensagem": verificado antes de tocar em
     * qualquer conteúdo. Todo acesso gera um log VIEW_REPORTED_MESSAGE,
     * mesmo que o admin não tome nenhuma ação depois: ler o conteúdo de
     * uma conversa privada é, em si, uma ação sensível.
     *
     * Este é o único caminho de acesso a conteúdo de mensagem no painel
     * administrativo: não existe (e não deve existir) um endpoint de
     * busca livre de mensagens/conversas.
     */
    async obterContextoMensagem(id, solicitante, contexto = {}) {
        const denuncia = await Denuncia.findByPk(id);

        if (!denuncia) {
            throw ErroApi.naoEncontrado("Denúncia não encontrada.");
        }

        if (denuncia.entidadeTipo !== "mensagem") {
            throw ErroApi.requisicaoInvalida(
                "Esta denúncia não é sobre uma mensagem."
            );
        }

        const mensagem = await Mensagem.findByPk(denuncia.entidadeId);

        if (!mensagem) {
            throw ErroApi.naoEncontrado("Mensagem denunciada não encontrada.");
        }

        // `criado_em` é `timestamptz`, então a data da mensagem denunciada pode ir e voltar como
        // `Date` sem deslocamento de fuso: o Postgres compara os dois no mesmo instante absoluto.
        const referencia = mensagem.criadoEm;

        const [antes, depois] = await Promise.all([
            Mensagem.findAll({
                where: {
                    conversaId: mensagem.conversaId,
                    criadoEm: { [Op.lt]: referencia }
                },
                order: [["criadoEm", "DESC"]],
                limit: 3
            }),
            Mensagem.findAll({
                where: {
                    conversaId: mensagem.conversaId,
                    criadoEm: { [Op.gt]: referencia }
                },
                order: [["criadoEm", "ASC"]],
                limit: 3
            })
        ]);

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: "visualizar_mensagem_denunciada",
            entidadeTipo: "denuncia",
            entidadeId: denuncia.id,
            descricao: "Contexto de mensagem denunciada consultado.",
            metadados: {
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
