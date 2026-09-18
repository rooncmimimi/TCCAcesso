import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import {
    Conversa,
    Mensagem,
    Empresa,
    Candidato,
    Usuario,
    UsuarioSeguido,
    EmpresaSeguida
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import {
    emitirParaConversa,
    emitirParaUsuario
} from "../realtime/socket.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";
import { garantirEmpresaAprovadaSeForEmpresa } from "../utils/autorizacao.js";

// Prévia curta da mensagem na notificação, nunca o texto inteiro (pode
// ter milhares de caracteres) nem dado sensível além do que a própria
// mensagem já é.
const TAMANHO_PREVIA_MENSAGEM = 120;

// Prévia guardada em `conversas.ultima_mensagem_previa`, do tamanho da coluna.
const TAMANHO_PREVIA_CONVERSA = 180;

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
 * Chat 1:1 entre dois usuários autenticados quaisquer (candidato, empresa ou administrador),
 * respeitando bloqueios e a preferência de mensagens do destinatário (`podeIniciarConversa`). Toda
 * leitura e escrita confere se o usuário autenticado é um dos dois participantes (proteção contra
 * IDOR, OWASP A01). Ser administrador não dá acesso a conversas das quais não participa.
 */
class ConversaService {
    async carregarConversa(id, transaction) {
        const conversa = await Conversa.findByPk(id, {
            include: INCLUDE_PARTICIPANTES,
            transaction
        });

        if (!conversa) {
            throw ErroApi.naoEncontrado("Conversa não encontrada.");
        }

        return conversa;
    }

    garantirParticipante(conversa, solicitante) {
        const usuarios = [conversa.usuarioAId, conversa.usuarioBId];

        if (!usuarios.includes(solicitante.id)) {
            throw ErroApi.acessoNegado("Você não participa desta conversa.");
        }
    }

    /*
     * Privacidade de mensagens: autoridade central.
     *
     * Única função que decide se `remetenteId` pode iniciar uma conversa nova com `destinatarioId`.
     * Nunca lança erro: devolve `{ permitido, motivo?, codigo? }`, para ser usada por `abrir()`
     * (que lança o erro) e pela consulta que os clientes fazem para decidir o estado do botão
     * "Enviar mensagem" antes do clique. Nenhum outro lugar deve reimplementar esta regra.
     *
     * `perfilPublico` não entra nesta conta: a preferência escolhida pelo usuário já é a regra, e
     * `usuarios_seguidos` representa seguidor aprovado nos dois casos (em perfil público, seguir é
     * imediato; em privado, a linha só existe depois da solicitação aceita).
     */
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

        // Bloqueio tem prioridade máxima: é checado antes da preferência, nos dois sentidos, sem
        // revelar quem bloqueou quem.
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
     * "`seguidorId` segue `seguidoId`?": igual a
     * `SeguidorService.podeVerConteudoPrivado`, mas para os dois tipos de
     * seguimento que existem no projeto: usuário↔usuário
     * (`usuarios_seguidos`) e candidato↔empresa (`empresas_seguidas`,
     * chave por `candidatoId`/`empresaId`, não por `usuarioId`). Quando
     * quem é seguido (`seguidoTipoUsuario`) é uma empresa, resolve os
     * registros de Candidato/Empresa antes de checar a tabela certa:
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

    /* Abrir ou recuperar conversa */
    async abrir({ usuarioId }, solicitante) {
        // Empresa pendente/reprovada/suspensa não usa mensagens: nem para
        // iniciar, nem para reabrir uma conversa já existente.
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        if (String(usuarioId) === String(solicitante.id)) {
            throw ErroApi.requisicaoInvalida(
                "Você não pode iniciar uma conversa consigo mesmo."
            );
        }

        const alvo = await Usuario.findByPk(usuarioId, {
            attributes: ["id", "ativo", "bloqueado"]
        });

        if (!alvo || !alvo.ativo || alvo.bloqueado) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        // Bloqueio sempre se aplica, inclusive para reabrir uma conversa existente.
        if (
            await BloqueioService.estaBloqueadoEntre(solicitante.id, usuarioId)
        ) {
            throw ErroApi.acessoNegado("Não é possível iniciar esta conversa.");
        }

        const [usuarioAId, usuarioBId] = [
            String(solicitante.id).toLowerCase(),
            String(usuarioId).toLowerCase()
        ].sort();

        // Conversa existente não reavalia a preferência de mensagens: uma mudança de configuração
        // feita depois pelo destinatário não a afeta.
        const existente = await Conversa.findOne({
            where: { usuarioAId, usuarioBId }
        });

        if (existente) {
            return this.carregarConversa(existente.id);
        }

        // Só uma conversa nova passa pela checagem de preferência:
        // reaproveita a mesma função usada pelo endpoint de consulta do
        // frontend (`GET /conversas/pode-iniciar/:usuarioId`), nunca
        // duplica a regra em outro lugar.
        const autorizacao = await this.podeIniciarConversa(
            solicitante.id,
            usuarioId
        );

        if (!autorizacao.permitido) {
            throw new ErroApi(autorizacao.codigo, autorizacao.motivo);
        }

        // Conversa recém-criada entra no topo da lista mesmo sem mensagem nenhuma.
        const [conversa] = await Conversa.findOrCreate({
            where: { usuarioAId, usuarioBId },
            defaults: { ultimaMensagemEm: new Date() }
        });

        return this.carregarConversa(conversa.id);
    }

    /* Listar conversas do usuário */
    async listar(solicitante, query) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

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
            order: [["ultimaMensagemEm", "DESC NULLS LAST"]]
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
                      // `remetenteId` pode ser `null` (remetente excluiu a conta), e
                      // `<> solicitante.id` nunca é verdadeiro para NULL na lógica de três valores
                      // do SQL; sem o `OR`, essas mensagens nunca contariam como não lidas.
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

    /* Total de mensagens não lidas (selo do cabeçalho) */
    async contarNaoLidas(solicitante) {
        const total = await Mensagem.count({
            where: {
                lida: false,
                // Mesmo cuidado de `listar()`: mensagem de remetente removido (`remetenteId` nulo)
                // continua contando como não lida.
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

    /* Detalhe */
    async buscarPorId(id, solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        return conversa;
    }

    /* Mensagens da conversa */
    async listarMensagens(id, solicitante, query) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

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
            order: [["criadoEm", "ASC"]]
        });

        return montarResposta("mensagens", rows, count, pagina, limite);
    }

    /* Enviar mensagem */
    async enviarMensagem(id, conteudo, solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const transaction = await sequelize.transaction();

        try {
            const conversa = await this.carregarConversa(id, transaction);

            this.garantirParticipante(conversa, solicitante);

            // Um dos participantes excluiu a conta: o histórico continua visível (por isso
            // `carregarConversa` não lança 404), mas a conversa fica somente leitura. É checado
            // antes do bloqueio abaixo para nunca chamar `estaBloqueadoEntre` com id nulo.
            if (!conversa.usuarioAId || !conversa.usuarioBId) {
                throw ErroApi.acessoNegado(
                    "Esta conversa não permite novas mensagens porque o outro usuário foi removido."
                );
            }

            // Bloqueio pode ter acontecido depois da conversa já existir:
            // uma conversa ativa também deve parar de funcionar.
            if (
                await BloqueioService.estaBloqueadoEntre(
                    conversa.usuarioAId,
                    conversa.usuarioBId
                )
            ) {
                throw ErroApi.acessoNegado(
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

            // A lista de conversas ordena por `ultimaMensagemEm` e mostra `ultimaMensagemPrevia`;
            // os dois são gravados aqui, na mesma transação do envio.
            await conversa.update(
                {
                    ultimaMensagemEm: mensagem.criadoEm,
                    ultimaMensagemPrevia: conteudo.slice(0, TAMANHO_PREVIA_CONVERSA)
                },
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
                    tipo: "mensagem",
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

    /* Marcar mensagens como lidas */
    async marcarComoLidas(id, solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        await Mensagem.update(
            { lida: true },
            {
                where: {
                    conversaId: id,
                    lida: false,
                    // Sem o `OR`, uma mensagem de remetente removido (`remetenteId` nulo) nunca
                    // seria marcada como lida.
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
