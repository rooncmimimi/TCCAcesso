import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { RefreshToken, Usuario } from "../models/index.js";
import { gerarTokenOpaco, hashToken } from "../utils/tokens.js";
import ApiError from "../utils/ApiError.js";

const DIAS_VALIDADE = 30;

// Janela de tolerância para reuso de um refresh token recém-revogado.
// Cobre corrida entre abas/dispositivos e requisições "em voo" (ex.: uma
// renovação que já tinha saído do cliente um instante antes de outra
// aba/dispositivo revogar aquele mesmo token) — sem isso, esses casos
// legítimos disparavam a mesma resposta usada contra roubo de token
// (derrubar TODAS as sessões do usuário, em todos os dispositivos).
// Fora dessa janela, um token revogado há mais tempo reapresentado
// continua sendo tratado como reuso genuíno (OWASP A07).
const SEGUNDOS_TOLERANCIA_REUSO = 20;

/**
 * Sessões persistentes com rotação de refresh token.
 *
 * Regras:
 * - o token em claro nunca é armazenado (apenas SHA-256);
 * - cada uso rotaciona o token e revoga o anterior;
 * - reuso de um token revogado há mais de SEGUNDOS_TOLERANCIA_REUSO invalida
 *   toda a família de sessões do usuário (detecção de roubo — OWASP A07);
 *   dentro dessa janela curta, é tratado como corrida legítima (ver
 *   `rotacionar`), nunca como ataque.
 * - a leitura do token usa lock de linha (`SELECT ... FOR UPDATE`) dentro
 *   de uma transação, para que duas requisições concorrentes com o MESMO
 *   token nunca decidam com base no mesmo estado "ainda não revogado" —
 *   a segunda espera a primeira terminar e já enxerga o estado atualizado.
 */
class RefreshTokenService {
    /**
     * Fase 9 (Bloco 3): mesma distinção de `authMiddleware` — bloqueio
     * administrativo tem mensagem específica e `codigo` identificável pelo
     * frontend; qualquer outro motivo de conta indisponível (`!ativo` sem
     * `bloqueado`, ou usuário já não existe mais) mantém a mensagem
     * genérica de antes. Centralizado aqui para os dois pontos de
     * `rotacionar` que precisam da mesma checagem nunca divergirem.
     */
    erroContaIndisponivel(usuario) {
        if (usuario?.bloqueado) {
            return ApiError.forbidden(
                usuario.motivoBloqueio
                    ? `Sua conta foi bloqueada pela moderação do ACESSO. Motivo: ${usuario.motivoBloqueio}`
                    : "Sua conta foi bloqueada pela moderação do ACESSO.",
                { codigo: "CONTA_BLOQUEADA" }
            );
        }

        return ApiError.forbidden("Conta indisponível.");
    }

    calcularExpiracao() {
        const data = new Date();
        data.setDate(data.getDate() + DIAS_VALIDADE);

        return data;
    }

    async emitir(usuarioId, contexto = {}, { transaction } = {}) {
        const token = gerarTokenOpaco();

        const registro = await RefreshToken.create(
            {
                usuarioId,
                tokenHash: hashToken(token),
                expiraEm: this.calcularExpiracao(),
                userAgent: contexto.userAgent
                    ? String(contexto.userAgent).slice(0, 255)
                    : null,
                ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null
            },
            { transaction }
        );

        return { refreshToken: token, registro };
    }

    async revogarTodos(usuarioId, { transaction } = {}) {
        await RefreshToken.update(
            { revogadoEm: new Date() },
            { where: { usuarioId, revogadoEm: null }, transaction }
        );
    }

    /* ==========================================================
       SESSÕES ATIVAS (tela de Configurações)
    ========================================================== */

    /** Lista as sessões ativas do usuário, sinalizando qual é a atual. */
    async listarAtivas(usuarioId, tokenAtual) {
        const hashAtual = tokenAtual ? hashToken(tokenAtual) : null;

        const registros = await RefreshToken.findAll({
            where: {
                usuarioId,
                revogadoEm: null,
                expiraEm: { [Op.gt]: new Date() }
            },
            order: [["created_at", "DESC"]]
        });

        return registros.map((registro) => ({
            id: registro.id,
            userAgent: registro.userAgent,
            ip: registro.ip,
            criadoEm: registro.created_at,
            expiraEm: registro.expiraEm,
            atual: hashAtual !== null && registro.tokenHash === hashAtual
        }));
    }

    /** Revoga uma sessão específica — só se pertencer ao próprio usuário. */
    async revogarPorId(usuarioId, id) {
        const registro = await RefreshToken.findOne({
            where: { id, usuarioId, revogadoEm: null }
        });

        if (!registro) {
            throw ApiError.notFound("Sessão não encontrada.");
        }

        await registro.update({ revogadoEm: new Date() });

        return { mensagem: "Sessão encerrada." };
    }

    /** Revoga todas as sessões do usuário, exceto a que corresponde ao token informado. */
    async revogarTodosExceto(usuarioId, tokenAtual) {
        const hashAtual = tokenAtual ? hashToken(tokenAtual) : null;

        await RefreshToken.update(
            { revogadoEm: new Date() },
            {
                where: {
                    usuarioId,
                    revogadoEm: null,
                    ...(hashAtual ? { tokenHash: { [Op.ne]: hashAtual } } : {})
                }
            }
        );

        return { mensagem: "As outras sessões foram encerradas." };
    }

    async rotacionar(token, contexto = {}) {
        if (!token) {
            throw ApiError.unauthorized("Refresh token não informado.");
        }

        const transaction = await sequelize.transaction();

        try {
            // Lock de linha (SELECT ... FOR UPDATE): se duas requisições
            // concorrentes chegarem com o MESMO token (duas abas, PC e
            // celular expirando quase juntos), a segunda espera a primeira
            // terminar esta transação inteira antes de ler o registro —
            // nunca as duas decidem em cima do mesmo estado "não revogado".
            const registro = await RefreshToken.findOne({
                where: { tokenHash: hashToken(token) },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!registro) {
                await transaction.rollback();
                throw ApiError.unauthorized("Sessão inválida.");
            }

            if (registro.revogadoEm) {
                // `substituidoPor` só é preenchido quando ESTE token
                // específico foi individualmente rotacionado (fluxo
                // normal, ou a própria tolerância abaixo) — nunca por
                // `revogar` (logout de um token específico) nem por
                // `revogarTodos` (sweep de segurança). Essa é a distinção
                // que importa: só um token que teve uma rotação
                // individual real registrada pode, dentro da janela
                // curta, ser tratado como uma renovação legítima
                // atrasada. Um token morto por logout explícito ou por um
                // sweep anterior nunca ganha tolerância nenhuma —
                // reapresentá-lo não é evidência de nada além de "essa
                // sessão específica já acabou".
                const foiRotacaoIndividual = Boolean(registro.substituidoPor);
                const segundosDesdeRevogacao =
                    (Date.now() - registro.revogadoEm.getTime()) / 1000;

                if (foiRotacaoIndividual && segundosDesdeRevogacao <= SEGUNDOS_TOLERANCIA_REUSO) {
                    // Dentro da janela de tolerância: trata como uma
                    // renovação legítima que só chegou um pouco atrasada
                    // (aba duplicada, retry de rede, requisição que já
                    // estava em voo) — NUNCA deslogar os outros
                    // dispositivos por causa disso. Emite uma sessão nova
                    // normalmente, sem tocar em nenhuma outra sessão do
                    // usuário.
                    const usuarioTolerado = await Usuario.findByPk(
                        registro.usuarioId,
                        { transaction }
                    );

                    if (!usuarioTolerado || usuarioTolerado.bloqueado || !usuarioTolerado.ativo) {
                        await transaction.rollback();
                        throw this.erroContaIndisponivel(usuarioTolerado);
                    }

                    const { refreshToken: tokenTolerado } = await this.emitir(
                        usuarioTolerado.id,
                        contexto,
                        { transaction }
                    );

                    await transaction.commit();

                    return { usuario: usuarioTolerado, refreshToken: tokenTolerado };
                }

                if (foiRotacaoIndividual) {
                    // Fora da janela de tolerância: reuso de um token que
                    // já foi individualmente substituído há mais tempo —
                    // esse é o sinal real de roubo de token (alguém está
                    // usando uma cópia antiga bem depois do dono ter
                    // seguido em frente). Derruba toda a família de
                    // sessões (OWASP A07).
                    await this.revogarTodos(registro.usuarioId, { transaction });
                    await transaction.commit();
                    throw ApiError.unauthorized("Sessão expirada. Entre novamente.");
                }

                // Revogado por logout explícito daquele token específico,
                // ou por um sweep de segurança anterior: não é evidência
                // de roubo, só um token que já não vale mais nada — não
                // amplifica derrubando mais nenhuma sessão.
                await transaction.rollback();
                throw ApiError.unauthorized("Sessão expirada. Entre novamente.");
            }

            if (registro.expiraEm.getTime() <= Date.now()) {
                await transaction.rollback();
                throw ApiError.unauthorized("Sessão expirada. Entre novamente.");
            }

            const usuario = await Usuario.findByPk(registro.usuarioId, { transaction });

            if (!usuario || usuario.bloqueado || !usuario.ativo) {
                await transaction.rollback();
                throw this.erroContaIndisponivel(usuario);
            }

            const { refreshToken, registro: novo } = await this.emitir(
                usuario.id,
                contexto,
                { transaction }
            );

            await registro.update(
                { revogadoEm: new Date(), substituidoPor: novo.id },
                { transaction }
            );

            await transaction.commit();

            return { usuario, refreshToken };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            throw erro;
        }
    }

    async revogar(token) {
        if (!token) {
            return { mensagem: "Sessão encerrada." };
        }

        await RefreshToken.update(
            { revogadoEm: new Date() },
            { where: { tokenHash: hashToken(token), revogadoEm: null } }
        );

        return { mensagem: "Sessão encerrada." };
    }

    async limparExpirados() {
        return RefreshToken.destroy({
            where: { expiraEm: { [Op.lt]: new Date() } }
        });
    }
}

export default new RefreshTokenService();
