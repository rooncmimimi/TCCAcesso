import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Conversa,
    Mensagem,
    Empresa,
    Candidato,
    Usuario,
    UsuarioSeguido,
    EmpresaSeguida
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import {
    emitirParaConversa,
    emitirParaUsuario
} from "../realtime/socket.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";

// Prévia curta da mensagem na notificação — nunca o texto inteiro (pode
// ter milhares de caracteres) nem dado sensível além do que a própria
// mensagem já é.
const TAMANHO_PREVIA_MENSAGEM = 120;

const ATRIBUTOS_PARTICIPANTE = ["id", "nome", "fotoPerfil", "tipoUsuario"];

const INCLUDE_PARTICIPANTES = [
    {
        model: Usuario,
        as: "usuarioA",
        attributes: ATRIBUTOS_PARTICIPANTE,
        include: [
            {
                model: Empresa,
                as: "empresa",
                attributes: ["id", "nomeFantasia", "razaoSocial", "logo"],
                required: false
            }
        ]
    },
    {
        model: Usuario,
        as: "usuarioB",
        attributes: ATRIBUTOS_PARTICIPANTE,
        include: [
            {
                model: Empresa,
                as: "empresa",
                attributes: ["id", "nomeFantasia", "razaoSocial", "logo"],
                required: false
            }
        ]
    }
];

/**
 * Chat 1:1 entre quaisquer dois usuários autenticados (candidato, empresa
 * ou administrador) — qualquer usuário pode conversar com qualquer outro,
 * respeitando bloqueios existentes.
 *
 * Toda leitura/escrita valida se o usuário autenticado é um dos dois
 * participantes da conversa (proteção contra IDOR — OWASP A01). Ser
 * administrador NÃO concede acesso a conversas das quais não participa.
 */
class ConversaService {
    async carregarConversa(id, transaction) {
        const conversa = await Conversa.findByPk(id, {
            include: INCLUDE_PARTICIPANTES,
            transaction
        });

        if (!conversa) {
            throw ApiError.notFound("Conversa não encontrada.");
        }

        return conversa;
    }

    garantirParticipante(conversa, solicitante) {
        const usuarios = [conversa.usuarioAId, conversa.usuarioBId];

        if (!usuarios.includes(solicitante.id)) {
            throw ApiError.forbidden("Você não participa desta conversa.");
        }
    }

    /* ==========================================================
       PRIVACIDADE DE MENSAGENS (Fase 4) — autoridade central
       ==========================================================
       Única função que decide se `remetenteId` pode INICIAR uma conversa
       nova com `destinatarioId`. Nunca lança erro — sempre devolve
       `{ permitido, motivo?, codigo? }`, para ser reaproveitada tanto por
       `abrir()` (que lança o erro de fato) quanto pelo endpoint de
       consulta usado pelo frontend para decidir o estado do botão
       "Mandar mensagem" ANTES do clique. Nenhum outro lugar do código
       deve reimplementar esta regra.

       `perfilPublico` NUNCA entra nesta conta: a configuração escolhida
       pelo usuário já é a fonte da regra em qualquer um dos dois casos
       (aprovado explicitamente), e `usuarios_seguidos` já representa
       "seguidor aprovado" nos dois cenários — perfil público (seguir é
       imediato) ou privado (só existe linha ali depois de uma solicitação
       aceita, Fase 3) — então checar essa tabela já é suficiente.
    ========================================================== */
    async podeIniciarConversa(remetenteId, destinatarioId) {
        if (String(remetenteId) === String(destinatarioId)) {
            return {
                permitido: false,
                motivo: "Você não pode iniciar uma conversa consigo mesmo.",
                codigo: 400
            };
        }

        const [remetente, destinatario] = await Promise.all([
            Usuario.findByPk(remetenteId, {
                attributes: ["id", "tipoUsuario"]
            }),
            Usuario.findByPk(destinatarioId, {
                attributes: [
                    "id",
                    "ativo",
                    "bloqueado",
                    "tipoUsuario",
                    "preferenciaMensagens"
                ]
            })
        ]);

        if (!destinatario || !destinatario.ativo || destinatario.bloqueado) {
            return {
                permitido: false,
                motivo: "Usuário não encontrado.",
                codigo: 404
            };
        }

        // Bloqueio tem prioridade máxima — checado antes de qualquer
        // configuração de preferência, nas duas direções, sem revelar
        // qual dos dois bloqueou o outro (mesma mensagem genérica que já
        // existia aqui antes da Fase 4).
        if (
            await BloqueioService.estaBloqueadoEntre(
                remetenteId,
                destinatarioId
            )
        ) {
            return {
                permitido: false,
                motivo: "Não é possível iniciar esta conversa.",
                codigo: 403
            };
        }

        switch (destinatario.preferenciaMensagens) {
            case "ninguem":
                return {
                    permitido: false,
                    motivo:
                        "Este usuário desativou o recebimento de novas mensagens.",
                    codigo: 403
                };

            case "empresas":
                if (remetente?.tipoUsuario !== "empresa") {
                    return {
                        permitido: false,
                        motivo:
                            "Apenas empresas podem iniciar conversas com este usuário.",
                        codigo: 403
                    };
                }
                return { permitido: true };

            case "seguidores": {
                // "Seguidores" = quem segue o destinatário → o remetente
                // precisa seguir o destinatário.
                const segue = await this.segueUsuario(
                    remetenteId,
                    destinatarioId,
                    destinatario.tipoUsuario
                );

                if (!segue) {
                    return {
                        permitido: false,
                        motivo:
                            "Você não pode iniciar uma conversa com este usuário porque ele permite novas mensagens apenas de seguidores.",
                        codigo: 403
                    };
                }
                return { permitido: true };
            }

            case "seguindo": {
                // "Pessoas que você segue" (do ponto de vista do
                // destinatário) → o destinatário precisa seguir o
                // remetente.
                const seguido = await this.segueUsuario(
                    destinatarioId,
                    remetenteId,
                    remetente?.tipoUsuario
                );

                if (!seguido) {
                    return {
                        permitido: false,
                        motivo:
                            "Este usuário só aceita novas mensagens de pessoas que ele segue.",
                        codigo: 403
                    };
                }
                return { permitido: true };
            }

            case "mutuo": {
                const [remetenteSegueDestinatario, destinatarioSegueRemetente] =
                    await Promise.all([
                        this.segueUsuario(
                            remetenteId,
                            destinatarioId,
                            destinatario.tipoUsuario
                        ),
                        this.segueUsuario(
                            destinatarioId,
                            remetenteId,
                            remetente?.tipoUsuario
                        )
                    ]);

                if (!remetenteSegueDestinatario || !destinatarioSegueRemetente) {
                    return {
                        permitido: false,
                        motivo:
                            "Este usuário só aceita novas mensagens de seguidores mútuos.",
                        codigo: 403
                    };
                }
                return { permitido: true };
            }

            case "todos":
            default:
                return { permitido: true };
        }
    }

    /**
     * "`seguidorId` segue `seguidoId`?" — igual a
     * `SeguidorService.podeVerConteudoPrivado`, mas para os DOIS tipos de
     * seguimento que existem no projeto: usuário↔usuário
     * (`usuarios_seguidos`) e candidato↔empresa (`empresas_seguidas`,
     * chave por `candidatoId`/`empresaId`, não por `usuarioId`). Quando
     * quem é seguido (`seguidoTipoUsuario`) é uma empresa, resolve os
     * registros de Candidato/Empresa antes de checar a tabela certa —
     * sem isso, a opção "Apenas seguidores"/"Apenas pessoas que você
     * segue" nunca funcionaria corretamente para uma conta de empresa.
     */
    async segueUsuario(seguidorId, seguidoId, seguidoTipoUsuario) {
        if (seguidoTipoUsuario === "empresa") {
            const [candidato, empresa] = await Promise.all([
                Candidato.findOne({
                    where: { usuarioId: seguidorId },
                    attributes: ["id"]
                }),
                Empresa.findOne({
                    where: { usuarioId: seguidoId },
                    attributes: ["id"]
                })
            ]);

            if (!candidato || !empresa) {
                return false;
            }

            const vinculo = await EmpresaSeguida.findOne({
                where: { candidatoId: candidato.id, empresaId: empresa.id }
            });

            return Boolean(vinculo);
        }

        const vinculo = await UsuarioSeguido.findOne({
            where: { seguidorId, seguidoId }
        });

        return Boolean(vinculo);
    }

    /* ==========================================================
       ABRIR / RECUPERAR CONVERSA
    ========================================================== */
    async abrir({ usuarioId }, solicitante) {
        if (String(usuarioId) === String(solicitante.id)) {
            throw ApiError.badRequest(
                "Você não pode iniciar uma conversa consigo mesmo."
            );
        }

        const alvo = await Usuario.findByPk(usuarioId, {
            attributes: ["id", "ativo", "bloqueado"]
        });

        if (!alvo || !alvo.ativo || alvo.bloqueado) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        // Bloqueio sempre se aplica, inclusive para reabrir uma conversa
        // já existente — comportamento inalterado desde antes da Fase 4.
        if (
            await BloqueioService.estaBloqueadoEntre(solicitante.id, usuarioId)
        ) {
            throw ApiError.forbidden("Não é possível iniciar esta conversa.");
        }

        const [usuarioAId, usuarioBId] = [
            String(solicitante.id).toLowerCase(),
            String(usuarioId).toLowerCase()
        ].sort();

        // Conversa já existente: nunca reavalia a preferência de
        // mensagens — uma mudança de configuração feita pelo destinatário
        // depois de a conversa já existir não a afeta (Fase 4).
        const existente = await Conversa.findOne({
            where: { usuarioAId, usuarioBId }
        });

        if (existente) {
            return this.carregarConversa(existente.id);
        }

        // Só uma conversa NOVA passa pela checagem de preferência —
        // reaproveita a MESMA função usada pelo endpoint de consulta do
        // frontend (`GET /conversas/pode-iniciar/:usuarioId`), nunca
        // duplica a regra em outro lugar.
        const autorizacao = await this.podeIniciarConversa(
            solicitante.id,
            usuarioId
        );

        if (!autorizacao.permitido) {
            throw new ApiError(autorizacao.codigo, autorizacao.motivo);
        }

        const [conversa] = await Conversa.findOrCreate({
            where: { usuarioAId, usuarioBId },
            defaults: { ultimaMensagem: new Date() }
        });

        return this.carregarConversa(conversa.id);
    }

    /* ==========================================================
       LISTAR CONVERSAS DO USUÁRIO
    ========================================================== */
    async listar(solicitante, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const filtros = [
            { usuarioAId: solicitante.id },
            { usuarioBId: solicitante.id }
        ];

        const { rows, count } = await Conversa.findAndCountAll({
            where: { [Op.or]: filtros },
            include: INCLUDE_PARTICIPANTES,
            limit: limite,
            offset,
            distinct: true,
            order: [["ultima_mensagem", "DESC NULLS LAST"]]
        });

        const idsConversas = rows.map((conversa) => conversa.id);

        const contagens = idsConversas.length
            ? await Mensagem.findAll({
                  attributes: [
                      "conversaId",
                      [sequelize.fn("COUNT", sequelize.col("id")), "total"]
                  ],
                  where: {
                      conversaId: { [Op.in]: idsConversas },
                      lida: false,
                      // Fase 8: `remetenteId` pode ser `null` (remetente
                      // excluiu a conta) — `<> solicitante.id` sozinho
                      // NUNCA é verdadeiro para NULL (semântica de 3
                      // valores do SQL), então sem o `OR` explícito essas
                      // mensagens ficariam de fora da contagem de não
                      // lidas para sempre, mesmo nunca marcadas como lidas.
                      [Op.or]: [
                          { remetenteId: { [Op.ne]: solicitante.id } },
                          { remetenteId: null }
                      ]
                  },
                  group: ["conversaId"],
                  raw: true
              })
            : [];

        const mapaNaoLidas = Object.fromEntries(
            contagens.map((c) => [c.conversaId, Number(c.total)])
        );

        const comContagem = rows.map((conversa) => ({
            ...conversa.toJSON(),
            mensagensNaoLidas: mapaNaoLidas[conversa.id] ?? 0
        }));

        return montarResposta("conversas", comContagem, count, pagina, limite);
    }

    /* ==========================================================
       TOTAL DE MENSAGENS NÃO LIDAS (para o badge do cabeçalho)
    ========================================================== */
    async contarNaoLidas(solicitante) {
        const total = await Mensagem.count({
            where: {
                lida: false,
                // Fase 8: mesmo cuidado de `listar()` — `remetenteId` nulo
                // (remetente removido) precisa continuar contando como
                // "não lida".
                [Op.or]: [
                    { remetenteId: { [Op.ne]: solicitante.id } },
                    { remetenteId: null }
                ]
            },
            include: [
                {
                    model: Conversa,
                    as: "conversa",
                    attributes: [],
                    where: {
                        [Op.or]: [
                            { usuarioAId: solicitante.id },
                            { usuarioBId: solicitante.id }
                        ]
                    }
                }
            ]
        });

        return { naoLidas: total };
    }

    /* ==========================================================
       DETALHE
    ========================================================== */
    async findById(id, solicitante) {
        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        return conversa;
    }

    /* ==========================================================
       MENSAGENS DA CONVERSA
    ========================================================== */
    async listarMensagens(id, solicitante, query) {
        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Mensagem.findAndCountAll({
            where: { conversaId: id },
            include: [
                {
                    model: Usuario,
                    as: "remetente",
                    attributes: ["id", "nome", "fotoPerfil"]
                }
            ],
            limit: limite,
            offset,
            order: [["created_at", "ASC"]]
        });

        return montarResposta("mensagens", rows, count, pagina, limite);
    }

    /* ==========================================================
       ENVIAR MENSAGEM
    ========================================================== */
    async enviarMensagem(id, conteudo, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const conversa = await this.carregarConversa(id, transaction);

            this.garantirParticipante(conversa, solicitante);

            // Fase 8: um dos dois participantes excluiu a conta — o
            // histórico continua visível (por isso `carregarConversa` não
            // lança 404 aqui), mas a conversa vira somente-leitura. Checa
            // ANTES do bloqueio abaixo para nunca chamar
            // `estaBloqueadoEntre` com um id nulo.
            if (!conversa.usuarioAId || !conversa.usuarioBId) {
                throw ApiError.forbidden(
                    "Esta conversa não permite novas mensagens porque o outro usuário foi removido."
                );
            }

            // Bloqueio pode ter acontecido DEPOIS da conversa já existir —
            // uma conversa ativa também deve parar de funcionar.
            if (
                await BloqueioService.estaBloqueadoEntre(
                    conversa.usuarioAId,
                    conversa.usuarioBId
                )
            ) {
                throw ApiError.forbidden(
                    "Não é possível enviar mensagens nesta conversa."
                );
            }

            const mensagem = await Mensagem.create(
                {
                    conversaId: id,
                    remetenteId: solicitante.id,
                    conteudo
                },
                { transaction }
            );

            await conversa.update(
                { ultimaMensagem: new Date() },
                { transaction }
            );

            const destinatarioId =
                conversa.usuarioAId === solicitante.id
                    ? conversa.usuarioBId
                    : conversa.usuarioAId;

            const previa =
                conteudo.length > TAMANHO_PREVIA_MENSAGEM
                    ? `${conteudo.slice(0, TAMANHO_PREVIA_MENSAGEM)}…`
                    : conteudo;

            const notificacao = await NotificacaoService.criar(
                {
                    usuarioId: destinatarioId,
                    tipo: "Mensagem",
                    titulo: "Nova mensagem recebida",
                    descricao: `${solicitante.nome}: ${previa}`,
                    subtipo: "mensagem_nova",
                    entidadeTipo: "conversa",
                    entidadeId: id,
                    atorId: solicitante.id
                },
                { transaction }
            );

            await transaction.commit();

            if (notificacao) {
                NotificacaoService.emitirNotificacaoCriada(
                    notificacao,
                    await NotificacaoService.contarNaoLidasDe(destinatarioId)
                );
            }

            /* Tempo real: só depois de persistir. */
            const payload = {
                conversaId: id,
                mensagem: mensagem.toJSON()
            };

            emitirParaConversa(id, "mensagem:nova", payload);
            emitirParaUsuario(destinatarioId, "mensagem:nova", payload);
            emitirParaUsuario(destinatarioId, "conversa:atualizada", {
                conversaId: id
            });
            emitirParaUsuario(solicitante.id, "conversa:atualizada", {
                conversaId: id
            });

            return mensagem;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       MARCAR MENSAGENS COMO LIDAS
    ========================================================== */
    async marcarComoLidas(id, solicitante) {
        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        await Mensagem.update(
            { lida: true },
            {
                where: {
                    conversaId: id,
                    lida: false,
                    // Fase 8: sem o `OR`, uma mensagem de remetente já
                    // removido (remetenteId nulo) nunca seria marcada como
                    // lida — ficaria "não lida" para sempre.
                    [Op.or]: [
                        { remetenteId: { [Op.ne]: solicitante.id } },
                        { remetenteId: null }
                    ]
                }
            }
        );

        emitirParaConversa(id, "mensagem:lida", {
            conversaId: id,
            usuarioId: solicitante.id
        });

        return { mensagem: "Mensagens marcadas como lidas." };
    }
}

export default new ConversaService();
