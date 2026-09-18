import { Op } from "sequelize";

import sequelize from "../config/bancoDeDados.js";
import {
    Usuario,
    Candidato,
    Empresa,
    UsuarioSeguido,
    EmpresaSeguida,
    FavoritoVaga,
    Vaga,
    Curtida,
    SolicitacaoSeguimento,
    Notificacao
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { ehAdministrador } from "../utils/autorizacao.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";

const PERFIL_PUBLICO = [
    "id",
    "nome",
    "fotoPerfil",
    "capaPerfil",
    "tipoUsuario"
];

const ATRIBUTOS_EMPRESA_SUGESTAO = [
    "id",
    "usuarioId",
    "nomeFantasia",
    "razaoSocial",
    "logo",
    "setor",
    "cidade",
    "descricao",
    "empresaVerificada",
    "statusAprovacao"
];

/**
 * Rede de conexões: seguir usuários e empresas.
 *
 * O seguidor é sempre o usuário autenticado: nunca vem do corpo da
 * requisição (proteção contra IDOR / OWASP A01).
 */
class SeguidorService {
    async garantirUsuarioAtivo(usuarioId) {
        const usuario = await Usuario.findByPk(usuarioId, {
            attributes: [...PERFIL_PUBLICO, "ativo", "bloqueado", "perfilPublico"]
        });

        if (!usuario || !usuario.ativo || usuario.bloqueado) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        return usuario;
    }

    /* Seguir e deixar de seguir usuário */
    async alternarUsuario(seguidoId, solicitante) {
        if (String(seguidoId) === String(solicitante.id)) {
            throw ErroApi.requisicaoInvalida("Você não pode seguir a si mesmo.");
        }

        const seguido = await this.garantirUsuarioAtivo(seguidoId);

        if (await BloqueioService.estaBloqueadoEntre(solicitante.id, seguidoId)) {
            throw ErroApi.acessoNegado("Você não pode seguir este usuário.");
        }

        const existente = await UsuarioSeguido.findOne({
            where: { seguidorId: solicitante.id, seguidoId }
        });

        if (existente) {
            await existente.destroy();

            return {
                seguindo: false,
                totalSeguidores: await UsuarioSeguido.count({
                    where: { seguidoId }
                })
            };
        }

        // Perfil privado nunca é seguido diretamente por esta rota: o cliente precisa passar pela
        // solicitação (`solicitar`). Vale mesmo que o cliente chame esta rota por engano, porque o
        // backend não confia só na escolha dele.
        if (!seguido.perfilPublico) {
            throw ErroApi.acessoNegado(
                "Este perfil é privado. Envie uma solicitação para seguir."
            );
        }

        await UsuarioSeguido.create({
            seguidorId: solicitante.id,
            seguidoId
        });

        await NotificacaoService.criar({
            usuarioId: seguido.id,
            tipo: "sistema",
            titulo: "Você tem um novo seguidor",
            descricao: `${solicitante.nome} começou a seguir você.`,
            subtipo: "novo_seguidor_usuario",
            entidadeTipo: "usuario",
            entidadeId: solicitante.id,
            atorId: solicitante.id
        });

        return {
            seguindo: true,
            totalSeguidores: await UsuarioSeguido.count({ where: { seguidoId } })
        };
    }

    /* Seguir e deixar de seguir empresa */
    async alternarEmpresa(empresaId, solicitante) {
        const empresa = await Empresa.findByPk(empresaId);

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        if (
            await BloqueioService.estaBloqueadoEntre(
                solicitante.id,
                empresa.usuarioId
            )
        ) {
            throw ErroApi.acessoNegado("Você não pode seguir esta empresa.");
        }

        const candidato = await Candidato.findOne({
            where: { usuarioId: solicitante.id }
        });

        if (!candidato) {
            throw ErroApi.acessoNegado(
                "Apenas candidatos podem seguir empresas."
            );
        }

        const existente = await EmpresaSeguida.findOne({
            where: { candidatoId: candidato.id, empresaId }
        });

        if (existente) {
            await existente.destroy();

            return {
                seguindo: false,
                totalSeguidores: await EmpresaSeguida.count({
                    where: { empresaId }
                })
            };
        }

        await EmpresaSeguida.create({
            candidatoId: candidato.id,
            empresaId
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "sistema",
            titulo: "Novo seguidor",
            descricao: `${solicitante.nome} começou a seguir sua empresa.`,
            subtipo: "novo_seguidor_empresa",
            entidadeTipo: "usuario",
            entidadeId: solicitante.id,
            atorId: solicitante.id
        });

        return {
            seguindo: true,
            totalSeguidores: await EmpresaSeguida.count({ where: { empresaId } })
        };
    }

    /* Solicitações de seguir (perfil privado) */

    /**
     * Autorização de conteúdo: dono/admin sempre veem; qualquer outro
     * usuário só se já for seguidor aprovado (`usuarios_seguidos`).
     * Reaproveitado por todo lugar que precisa decidir se mostra as
     * publicações de alguém. Nunca duplicar esta lógica em outro service.
     */
    async podeVerConteudoPrivado(usuarioAlvoId, solicitante) {
        if (!solicitante) return false;

        if (String(solicitante.id) === String(usuarioAlvoId) || ehAdministrador(solicitante)) {
            return true;
        }

        const segue = await UsuarioSeguido.findOne({
            where: { seguidorId: solicitante.id, seguidoId: usuarioAlvoId }
        });

        return Boolean(segue);
    }

    /**
     * "Seguir" um perfil privado: cria uma solicitação pendente em vez de
     * seguir na hora. Se o alvo for público (cliente chamou a rota errada,
     * ou o perfil mudou de privado pra público entre um clique e outro),
     * segue direto por robustez: nunca deixa uma solicitação inútil
     * pendurada contra um perfil que nem precisa mais de aprovação.
     */
    async solicitar(destinatarioId, solicitante) {
        if (String(destinatarioId) === String(solicitante.id)) {
            throw ErroApi.requisicaoInvalida("Você não pode solicitar seguir a si mesmo.");
        }

        const destinatario = await this.garantirUsuarioAtivo(destinatarioId);

        if (await BloqueioService.estaBloqueadoEntre(solicitante.id, destinatarioId)) {
            throw ErroApi.acessoNegado("Você não pode seguir este usuário.");
        }

        if (destinatario.perfilPublico) {
            return { ...(await this.alternarUsuario(destinatarioId, solicitante)), solicitacaoCriada: false };
        }

        const jaSegue = await UsuarioSeguido.findOne({
            where: { seguidorId: solicitante.id, seguidoId: destinatarioId }
        });

        if (jaSegue) {
            throw ErroApi.conflito("Você já segue este usuário.");
        }

        let solicitacao;

        try {
            solicitacao = await SolicitacaoSeguimento.create({
                solicitanteId: solicitante.id,
                destinatarioId
            });
        } catch (erro) {
            if (erro.name === "SequelizeUniqueConstraintError") {
                throw ErroApi.conflito(
                    "Você já tem uma solicitação pendente para este usuário."
                );
            }
            throw erro;
        }

        await NotificacaoService.criar({
            usuarioId: destinatarioId,
            tipo: "sistema",
            titulo: "Nova solicitação para seguir você",
            descricao: `${solicitante.nome} solicitou seguir você.`,
            subtipo: "solicitacao_seguimento",
            entidadeTipo: "solicitacao_seguimento",
            entidadeId: solicitacao.id,
            atorId: solicitante.id
        });

        return { seguindo: false, solicitacaoCriada: true, solicitacaoPendente: true };
    }

    /** Desiste da própria solicitação pendente, idempotente. */
    async cancelarSolicitacao(destinatarioId, solicitante) {
        await SolicitacaoSeguimento.destroy({
            where: {
                solicitanteId: solicitante.id,
                destinatarioId,
                status: "pendente"
            }
        });

        return { solicitacaoPendente: false };
    }

    /**
     * Aceitar e recusar usam a técnica de `SessaoService.rotacionar` (transação e
     * `SELECT ... FOR UPDATE`): duas tentativas simultâneas sobre a mesma solicitação (aceitar duas
     * vezes, aceitar e recusar juntos, ou o solicitante cancelando enquanto o destinatário decide)
     * nunca processam a mesma linha duas vezes; a segunda encontra a linha já apagada e recebe um
     * 404 limpo.
     *
     * A linha é sempre apagada no final, aceita ou recusada: uma solicitação resolvida não tem
     * valor de histórico (o seguimento fica em `usuarios_seguidos`), e apagar também impede
     * processar a mesma solicitação duas vezes.
     */
    async _resolverSolicitacao(solicitacaoId, solicitante, aceitar) {
        const transaction = await sequelize.transaction();

        try {
            const solicitacao = await SolicitacaoSeguimento.findOne({
                where: {
                    id: solicitacaoId,
                    destinatarioId: solicitante.id,
                    status: "pendente"
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!solicitacao) {
                throw ErroApi.naoEncontrado("Solicitação não encontrada ou já processada.");
            }

            let notificacaoAceite = null;

            if (aceitar) {
                // findOrCreate, não create puro: se por alguma corrida o
                // seguimento já existir (ex.: o próprio destinatário já
                // seguia de volta, ou dois cliques quase simultâneos),
                // nunca falha por violar a UNIQUE de usuarios_seguidos.
                await UsuarioSeguido.findOrCreate({
                    where: {
                        seguidorId: solicitacao.solicitanteId,
                        seguidoId: solicitacao.destinatarioId
                    },
                    transaction
                });

                // Avisa quem pediu para seguir que o pedido foi aceito. Como em
                // `ConversaService.enviarMensagem`, a notificação é criada dentro da transação e só
                // é emitida em tempo real depois do commit, para nunca anunciar algo que pode
                // sofrer rollback.
                notificacaoAceite = await NotificacaoService.criar(
                    {
                        usuarioId: solicitacao.solicitanteId,
                        tipo: "sistema",
                        titulo: "Solicitação para seguir aceita",
                        descricao: `${solicitante.nome} aceitou sua solicitação para seguir.`,
                        subtipo: "solicitacao_seguimento_aceita",
                        entidadeTipo: "usuario",
                        entidadeId: solicitante.id,
                        atorId: solicitante.id
                    },
                    { transaction }
                );
            }

            await solicitacao.destroy({ transaction });

            // A notificação original ("fulano solicitou seguir você") deixa
            // de aparecer como pendente/acionável, com o mesmo padrão de "marcar
            // como lida" já usado no resto do app, sem inventar um estado novo.
            await Notificacao.update(
                { lida: true },
                {
                    where: {
                        entidadeTipo: "solicitacao_seguimento",
                        entidadeId: solicitacaoId
                    },
                    transaction
                }
            );

            await transaction.commit();

            if (notificacaoAceite) {
                NotificacaoService.emitirNotificacaoCriada(
                    notificacaoAceite,
                    await NotificacaoService.contarNaoLidasDe(solicitacao.solicitanteId)
                );
            }

            return { aceita: aceitar };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            throw erro;
        }
    }

    async aceitarSolicitacao(solicitacaoId, solicitante) {
        return this._resolverSolicitacao(solicitacaoId, solicitante, true);
    }

    async recusarSolicitacao(solicitacaoId, solicitante) {
        return this._resolverSolicitacao(solicitacaoId, solicitante, false);
    }

    /* Listagens */
    async listarSeguidores(usuarioId, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await UsuarioSeguido.findAndCountAll({
            where: { seguidoId: usuarioId },
            include: [
                {
                    model: Usuario,
                    as: "seguidor",
                    attributes: PERFIL_PUBLICO
                }
            ],
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta(
            "seguidores",
            rows.map((item) => item.seguidor),
            count,
            pagina,
            limite
        );
    }

    async listarSeguindo(usuarioId, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await UsuarioSeguido.findAndCountAll({
            where: { seguidorId: usuarioId },
            include: [
                {
                    model: Usuario,
                    as: "seguido",
                    attributes: PERFIL_PUBLICO
                }
            ],
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta(
            "seguindo",
            rows.map((item) => item.seguido),
            count,
            pagina,
            limite
        );
    }

    /**
     * Contadores e estado do usuário autenticado em relação ao perfil. `perfilPublico`,
     * `elesSeguemVoce`, `solicitacaoPendente` e `bloqueado` são campos adicionais: quem lê só
     * `seguindoEsteUsuario` e os contadores não é afetado.
     *
     * `bloqueado` permite ao `SeguirButton` se esconder onde não há outra barreira antes dele
     * (`/descobrir` já exclui bloqueados; "Seguir de volta" nas notificações não, porque a
     * notificação pode ser anterior ao bloqueio). Usa `BloqueioService.estaBloqueadoEntre`, que
     * verifica os dois sentidos.
     */
    async resumo(usuarioId, solicitante) {
        const [alvo, seguidores, seguindo, relacao, elesSeguemVoce, solicitacaoPendente, bloqueado] = await Promise.all([
            Usuario.findByPk(usuarioId, { attributes: ["perfilPublico"] }),
            UsuarioSeguido.count({ where: { seguidoId: usuarioId } }),
            UsuarioSeguido.count({ where: { seguidorId: usuarioId } }),
            solicitante
                ? UsuarioSeguido.findOne({
                      where: {
                          seguidorId: solicitante.id,
                          seguidoId: usuarioId
                      }
                  })
                : null,
            solicitante
                ? UsuarioSeguido.findOne({
                      where: { seguidorId: usuarioId, seguidoId: solicitante.id }
                  })
                : null,
            solicitante
                ? SolicitacaoSeguimento.findOne({
                      where: {
                          solicitanteId: solicitante.id,
                          destinatarioId: usuarioId,
                          status: "pendente"
                      }
                  })
                : null,
            solicitante && String(solicitante.id) !== String(usuarioId)
                ? BloqueioService.estaBloqueadoEntre(solicitante.id, usuarioId)
                : false
        ]);

        return {
            totalSeguidores: seguidores,
            totalSeguindo: seguindo,
            seguindoEsteUsuario: Boolean(relacao),
            perfilPublico: alvo ? Boolean(alvo.perfilPublico) : true,
            elesSeguemVoce: Boolean(elesSeguemVoce),
            solicitacaoPendente: Boolean(solicitacaoPendente),
            bloqueado: Boolean(bloqueado)
        };
    }

    /** Contadores + estado do candidato autenticado em relação a uma empresa. */
    async resumoEmpresa(empresaId, solicitante) {
        const empresa = await Empresa.findByPk(empresaId, {
            attributes: ["id"]
        });

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        let candidato = null;

        if (solicitante) {
            candidato = await Candidato.findOne({
                where: { usuarioId: solicitante.id }
            });
        }

        const [totalSeguidores, relacao] = await Promise.all([
            EmpresaSeguida.count({ where: { empresaId } }),
            candidato
                ? EmpresaSeguida.findOne({
                      where: { empresaId, candidatoId: candidato.id }
                  })
                : null
        ]);

        return {
            totalSeguidores,
            seguindoEstaEmpresa: Boolean(relacao)
        };
    }

    /** IDs seguidos pelo usuário: usado para priorizar o feed. */
    async idsSeguidos(usuarioId) {
        const vinculos = await UsuarioSeguido.findAll({
            where: { seguidorId: usuarioId },
            attributes: ["seguidoId"]
        });

        return vinculos.map((item) => item.seguidoId);
    }

    /*
     * Descoberta: pessoas. Sugestões com motivo em texto simples, baseadas só em sinais não
     * sensíveis: cidade, título ou área profissional, curtidas em comum no feed e conexões em
     * comum. Nunca usa deficiência, diagnóstico ou qualquer dado de saúde, que nem são consultados
     * aqui.
     */
    async sugestoesPessoas(solicitante, limite = 8) {
        const limiteFinal = Math.min(Number(limite) || 8, 20);

        const [jaSeguidos, idsBloqueio, meuCandidato] = await Promise.all([
            this.idsSeguidos(solicitante.id),
            BloqueioService.idsRelacionados(solicitante.id),
            Candidato.findOne({
                where: { usuarioId: solicitante.id },
                attributes: ["cidade", "tituloProfissional"]
            })
        ]);

        const excluidos = [...new Set([...jaSeguidos, ...idsBloqueio, solicitante.id])];
        const candidatosPontuados = new Map();

        const pontuar = (usuario, pontos, motivo) => {
            if (!usuario || excluidos.includes(usuario.id)) return;
            const atual = candidatosPontuados.get(usuario.id) ?? { usuario, pontos: 0, motivos: [] };
            atual.pontos += pontos;
            if (!atual.motivos.includes(motivo)) atual.motivos.push(motivo);
            candidatosPontuados.set(usuario.id, atual);
        };

        // "Pessoas" precisa ser só candidatos: empresa e administrador nunca
        // entram aqui (empresa tem sua própria seção em sugestoesEmpresas).
        const filtroBase = {
            ativo: true,
            bloqueado: false,
            tipoUsuario: "candidato",
            id: { [Op.notIn]: excluidos }
        };

        if (meuCandidato?.cidade) {
            const mesmaCidade = await Usuario.findAll({
                where: filtroBase,
                attributes: PERFIL_PUBLICO,
                include: [
                    {
                        model: Candidato,
                        as: "candidato",
                        required: true,
                        where: { cidade: meuCandidato.cidade },
                        attributes: ["tituloProfissional", "cidade"]
                    }
                ],
                limit: 30
            });
            mesmaCidade.forEach((usuario) => pontuar(usuario, 3, `Também está em ${meuCandidato.cidade}`));
        }

        if (meuCandidato?.tituloProfissional) {
            const mesmaArea = await Usuario.findAll({
                where: filtroBase,
                attributes: PERFIL_PUBLICO,
                include: [
                    {
                        model: Candidato,
                        as: "candidato",
                        required: true,
                        where: { tituloProfissional: meuCandidato.tituloProfissional },
                        attributes: ["tituloProfissional", "cidade"]
                    }
                ],
                limit: 30
            });
            mesmaArea.forEach((usuario) => pontuar(usuario, 3, `Atua como ${meuCandidato.tituloProfissional}`));
        }

        // Interação pública em comum: curtiu as mesmas publicações que eu.
        const minhasCurtidas = await Curtida.findAll({
            where: { usuarioId: solicitante.id },
            attributes: ["postagemId"],
            limit: 50
        });
        const idsPostagensCurtidas = minhasCurtidas.map((c) => c.postagemId);
        if (idsPostagensCurtidas.length) {
            const outrasCurtidas = await Curtida.findAll({
                where: { postagemId: idsPostagensCurtidas, usuarioId: { [Op.notIn]: excluidos } },
                include: [
                    {
                        model: Usuario,
                        as: "usuario",
                        required: true,
                        attributes: PERFIL_PUBLICO,
                        where: { ativo: true, bloqueado: false, tipoUsuario: "candidato" }
                    }
                ],
                limit: 50
            });
            outrasCurtidas.forEach((curtida) =>
                pontuar(curtida.usuario, 2, "Interage com publicações parecidas com as suas")
            );
        }

        // Conexões em comum: seguido por quem eu já sigo.
        if (jaSeguidos.length) {
            const seguidosPorQuemSigo = await UsuarioSeguido.findAll({
                where: { seguidorId: jaSeguidos, seguidoId: { [Op.notIn]: excluidos } },
                include: [
                    {
                        model: Usuario,
                        as: "seguido",
                        required: true,
                        attributes: PERFIL_PUBLICO,
                        where: { ativo: true, bloqueado: false, tipoUsuario: "candidato" }
                    }
                ],
                limit: 50
            });
            seguidosPorQuemSigo.forEach((vinculo) =>
                pontuar(vinculo.seguido, 2, "Seguido por pessoas que você segue")
            );
        }

        let resultado = [...candidatosPontuados.values()].sort((a, b) => b.pontos - a.pontos);

        // Sem sinais suficientes: completa com perfis recentes (sem motivo enganoso de afinidade).
        if (resultado.length < limiteFinal) {
            const jaEncontrados = resultado.map((item) => item.usuario.id);
            const recentes = await Usuario.findAll({
                where: { ...filtroBase, id: { [Op.notIn]: [...excluidos, ...jaEncontrados] } },
                attributes: PERFIL_PUBLICO,
                include: [
                    { model: Candidato, as: "candidato", required: false, attributes: ["tituloProfissional"] }
                ],
                limit: limiteFinal - resultado.length,
                order: [["criadoEm", "DESC"]]
            });
            recentes.forEach((usuario) => pontuar(usuario, 0, "Novo no ACESSO"));
            resultado = [...candidatosPontuados.values()].sort((a, b) => b.pontos - a.pontos);
        }

        return resultado.slice(0, limiteFinal).map(({ usuario, motivos }) => ({
            id: usuario.id,
            nome: usuario.nome,
            fotoPerfil: usuario.fotoPerfil,
            tipo: usuario.tipoUsuario,
            titulo: usuario.candidato?.tituloProfissional ?? null,
            motivo: motivos[0] ?? "Novo no ACESSO"
        }));
    }

    /**
     * Sem chamador: a rota GET /seguir/sugestoes usa `sugestoesPessoas` direto, pelo
     * `SeguidorController.sugestoes`.
     */
    async sugestoes(solicitante, limite = 5) {
        return this.sugestoesPessoas(solicitante, limite);
    }

    /*
     * Descoberta: empresas. Só para candidatos, os únicos que seguem empresas. Critérios: empresas
     * donas de vagas favoritadas, mesmo setor das empresas de interesse e mesma cidade do
     * candidato; nunca deficiência ou diagnóstico.
     */
    async sugestoesEmpresas(solicitante, limite = 8) {
        const limiteFinal = Math.min(Number(limite) || 8, 20);

        const candidato = await Candidato.findOne({ where: { usuarioId: solicitante.id } });
        if (!candidato) return [];

        const [idsUsuariosBloqueio, seguidas, favoritas] = await Promise.all([
            BloqueioService.idsRelacionados(solicitante.id),
            EmpresaSeguida.findAll({ where: { candidatoId: candidato.id }, attributes: ["empresaId"] }),
            FavoritoVaga.findAll({
                where: { candidatoId: candidato.id },
                include: [{ model: Vaga, as: "vaga", attributes: ["empresaId"] }]
            })
        ]);

        const idsSeguidas = seguidas.map((vinculo) => vinculo.empresaId);
        const idsFavoritadas = [...new Set(favoritas.map((f) => f.vaga?.empresaId).filter(Boolean))];
        const excluidas = [...new Set(idsSeguidas)];

        const empresasPontuadas = new Map();
        const pontuar = (empresa, pontos, motivo) => {
            if (!empresa || excluidas.includes(empresa.id) || idsUsuariosBloqueio.includes(empresa.usuarioId)) return;
            const atual = empresasPontuadas.get(empresa.id) ?? { empresa, pontos: 0, motivos: [] };
            atual.pontos += pontos;
            if (!atual.motivos.includes(motivo)) atual.motivos.push(motivo);
            empresasPontuadas.set(empresa.id, atual);
        };

        if (idsFavoritadas.length) {
            const donasFavoritadas = await Empresa.findAll({
                where: { id: { [Op.in]: idsFavoritadas, [Op.notIn]: excluidas } },
                attributes: ATRIBUTOS_EMPRESA_SUGESTAO
            });
            donasFavoritadas.forEach((empresa) => pontuar(empresa, 4, "Você favoritou uma vaga desta empresa"));

            const empresasDeInteresse = await Empresa.findAll({
                where: { id: { [Op.in]: [...idsFavoritadas, ...idsSeguidas] } },
                attributes: ["setor"]
            });
            const setores = [...new Set(empresasDeInteresse.map((e) => e.setor).filter(Boolean))];
            if (setores.length) {
                const mesmoSetor = await Empresa.findAll({
                    where: { setor: { [Op.in]: setores }, id: { [Op.notIn]: [...excluidas, ...idsFavoritadas] } },
                    attributes: ATRIBUTOS_EMPRESA_SUGESTAO,
                    limit: 20
                });
                mesmoSetor.forEach((empresa) => pontuar(empresa, 2, `Também atua em ${empresa.setor}`));
            }
        }

        if (candidato.cidade) {
            const mesmaCidade = await Empresa.findAll({
                where: { cidade: candidato.cidade, id: { [Op.notIn]: excluidas } },
                attributes: ATRIBUTOS_EMPRESA_SUGESTAO,
                limit: 20
            });
            mesmaCidade.forEach((empresa) => pontuar(empresa, 1, `Está em ${candidato.cidade}`));
        }

        let resultado = [...empresasPontuadas.values()].sort((a, b) => b.pontos - a.pontos);

        if (resultado.length < limiteFinal) {
            const jaEncontradas = resultado.map((item) => item.empresa.id);
            const parceiras = await Empresa.findAll({
                where: {
                    id: { [Op.notIn]: [...excluidas, ...jaEncontradas] },
                    statusAprovacao: "aprovada"
                },
                attributes: ATRIBUTOS_EMPRESA_SUGESTAO,
                order: [
                    ["empresaVerificada", "DESC"],
                    ["criadoEm", "DESC"]
                ],
                limit: limiteFinal - resultado.length
            });
            parceiras.forEach((empresa) =>
                pontuar(empresa, 0, empresa.empresaVerificada ? "Empresa verificada no ACESSO" : "Empresa parceira do ACESSO")
            );
            resultado = [...empresasPontuadas.values()].sort((a, b) => b.pontos - a.pontos);
        }

        return resultado.slice(0, limiteFinal).map(({ empresa, motivos }) => ({
            id: empresa.id,
            usuarioId: empresa.usuarioId,
            nomeFantasia: empresa.nomeFantasia,
            razaoSocial: empresa.razaoSocial,
            logo: empresa.logo,
            setor: empresa.setor,
            cidade: empresa.cidade,
            descricao: empresa.descricao,
            empresaVerificada: empresa.empresaVerificada,
            motivo: motivos[0] ?? "Empresa parceira do ACESSO"
        }));
    }
}

export default new SeguidorService();
