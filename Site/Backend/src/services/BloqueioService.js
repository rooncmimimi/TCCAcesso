import { Op } from "sequelize";
import {
    Usuario,
    Candidato,
    Empresa,
    UsuarioBloqueio,
    UsuarioSeguido,
    EmpresaSeguida
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { ehAdministrador } from "../utils/authorization.js";

const PERFIL_PUBLICO_ATTRS = ["id", "nome", "fotoPerfil", "tipoUsuario"];

/**
 * Bloqueio de usuário-a-usuário e privacidade de perfil.
 *
 * Autoridade central: qualquer outro service que precise saber se dois
 * usuários estão bloqueados entre si, ou se um perfil pode ser visto,
 * passa por aqui — em vez de reimplementar a checagem em cada lugar.
 */
class BloqueioService {
    /** Existe bloqueio em QUALQUER direção entre os dois usuários? */
    async estaBloqueadoEntre(usuarioIdA, usuarioIdB) {
        if (!usuarioIdA || !usuarioIdB) return false;

        const bloqueio = await UsuarioBloqueio.findOne({
            where: {
                [Op.or]: [
                    { usuarioId: usuarioIdA, bloqueadoId: usuarioIdB },
                    { usuarioId: usuarioIdB, bloqueadoId: usuarioIdA }
                ]
            }
        });

        return Boolean(bloqueio);
    }

    /**
     * IDs de todos os usuários com bloqueio em qualquer direção com `usuarioId`
     * (quem eu bloqueei + quem me bloqueou) — usado para excluir de listas
     * sociais (sugestões, busca).
     */
    async idsRelacionados(usuarioId) {
        const registros = await UsuarioBloqueio.findAll({
            where: {
                [Op.or]: [{ usuarioId }, { bloqueadoId: usuarioId }]
            },
            attributes: ["usuarioId", "bloqueadoId"]
        });

        const ids = new Set();
        for (const r of registros) {
            ids.add(r.usuarioId === usuarioId ? r.bloqueadoId : r.usuarioId);
        }

        return [...ids];
    }

    /** `usuarioId` bloqueou `alvoId` (unidirecional — usado para o estado do botão no perfil). */
    async euBloqueiEste(usuarioId, alvoId) {
        if (!usuarioId || !alvoId) return false;

        const bloqueio = await UsuarioBloqueio.findOne({
            where: { usuarioId, bloqueadoId: alvoId }
        });

        return Boolean(bloqueio);
    }

    /**
     * Garante que `solicitante` pode ver o perfil de `usuarioAlvo` — usada
     * SÓ para empresa (`EmpresaService`), cujo comportamento de
     * público/privado a Fase 3 explicitamente não altera (empresas não têm
     * seguidor "aprovado" pendente — `EmpresaSeguida` é outra tabela, sem
     * conceito de solicitação). Mesma mensagem genérica nos dois casos
     * (bloqueio ou privacidade), para não revelar a causa. Dono do perfil e
     * administradores sempre passam.
     */
    async garantirVisibilidadePerfil(usuarioAlvo, solicitante) {
        const souDonoOuAdmin =
            solicitante &&
            (String(solicitante.id) === String(usuarioAlvo.id) ||
                ehAdministrador(solicitante));

        if (souDonoOuAdmin) {
            return;
        }

        await this.garantirNaoBloqueado(usuarioAlvo, solicitante);

        if (!usuarioAlvo.perfilPublico) {
            throw ApiError.forbidden("Este perfil não está disponível.");
        }
    }

    /**
     * Só a checagem de bloqueio (sem a checagem de `perfilPublico`) — usada
     * pelos perfis de USUÁRIO/CANDIDATO (Fase 3): perfil privado deixou de
     * significar "perfil invisível" para esse caso — o nome, foto, dados
     * profissionais e contadores continuam visíveis para qualquer usuário
     * autenticado não bloqueado; só as PUBLICAÇÕES ficam condicionadas a
     * seguidor aprovado (ver `SeguidorService.podeVerConteudoPrivado`,
     * aplicado separadamente em `PostagemService`/`ComentarioService`/
     * `CompartilhamentoService`/`BuscaService`). Dono/admin sempre passam.
     */
    async garantirNaoBloqueado(usuarioAlvo, solicitante) {
        const souDonoOuAdmin =
            solicitante &&
            (String(solicitante.id) === String(usuarioAlvo.id) ||
                ehAdministrador(solicitante));

        if (souDonoOuAdmin) {
            return;
        }

        if (solicitante) {
            const bloqueado = await this.estaBloqueadoEntre(
                solicitante.id,
                usuarioAlvo.id
            );

            if (bloqueado) {
                throw ApiError.forbidden("Este perfil não está disponível.");
            }
        }
    }

    /* ==========================================================
       BLOQUEAR
    ========================================================== */
    async bloquear(usuarioId, bloqueadoId) {
        if (String(usuarioId) === String(bloqueadoId)) {
            throw ApiError.badRequest("Você não pode bloquear a si mesmo.");
        }

        const alvo = await Usuario.findByPk(bloqueadoId, {
            attributes: ["id"]
        });

        if (!alvo) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        await UsuarioBloqueio.findOrCreate({
            where: { usuarioId, bloqueadoId }
        });

        // Bloqueio é incompatível com seguir/ser seguido — desfaz nos dois
        // sentidos, sem gerar notificação (é limpeza automática, não uma
        // ação social do usuário).
        await UsuarioSeguido.destroy({
            where: {
                [Op.or]: [
                    { seguidorId: usuarioId, seguidoId: bloqueadoId },
                    { seguidorId: bloqueadoId, seguidoId: usuarioId }
                ]
            }
        });

        const [candidatoUsuario, empresaUsuario, candidatoAlvo, empresaAlvo] =
            await Promise.all([
                Candidato.findOne({ where: { usuarioId } }),
                Empresa.findOne({ where: { usuarioId } }),
                Candidato.findOne({ where: { usuarioId: bloqueadoId } }),
                Empresa.findOne({ where: { usuarioId: bloqueadoId } })
            ]);

        const paresEmpresaSeguida = [];
        if (candidatoUsuario && empresaAlvo) {
            paresEmpresaSeguida.push({
                candidatoId: candidatoUsuario.id,
                empresaId: empresaAlvo.id
            });
        }
        if (candidatoAlvo && empresaUsuario) {
            paresEmpresaSeguida.push({
                candidatoId: candidatoAlvo.id,
                empresaId: empresaUsuario.id
            });
        }

        if (paresEmpresaSeguida.length > 0) {
            await EmpresaSeguida.destroy({
                where: { [Op.or]: paresEmpresaSeguida }
            });
        }

        return { bloqueado: true };
    }

    /* ==========================================================
       DESBLOQUEAR
    ========================================================== */
    async desbloquear(usuarioId, bloqueadoId) {
        await UsuarioBloqueio.destroy({
            where: { usuarioId, bloqueadoId }
        });

        return { bloqueado: false };
    }

    /* ==========================================================
       LISTAR BLOQUEADOS
    ========================================================== */
    async listarBloqueados(usuarioId, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await UsuarioBloqueio.findAndCountAll({
            where: { usuarioId },
            include: [
                {
                    model: Usuario,
                    as: "bloqueado",
                    attributes: PERFIL_PUBLICO_ATTRS
                }
            ],
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta(
            "bloqueados",
            rows.map((item) => item.bloqueado),
            count,
            pagina,
            limite
        );
    }

    /* ==========================================================
       PRIVACIDADE DO PERFIL
    ========================================================== */
    async atualizarPrivacidade(usuarioId, perfilPublico) {
        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        usuario.perfilPublico = Boolean(perfilPublico);
        await usuario.save();

        return { perfilPublico: usuario.perfilPublico };
    }

    /**
     * Quem pode INICIAR uma nova conversa com este usuário (Fase 4) — só
     * grava a configuração; a autorização em si é decidida por
     * `ConversaService.podeIniciarConversa`, nunca aqui.
     */
    async atualizarPreferenciaMensagens(usuarioId, preferenciaMensagens) {
        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        usuario.preferenciaMensagens = preferenciaMensagens;
        await usuario.save();

        return { preferenciaMensagens: usuario.preferenciaMensagens };
    }
}

export default new BloqueioService();
