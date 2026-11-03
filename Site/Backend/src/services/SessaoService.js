import crypto from "node:crypto";
import { Op } from "sequelize";
import env from "../config/env.js";
import sequelize from "../config/bancoDeDados.js";
import { Sessao, Usuario } from "../models/index.js";
import { gerarTokenOpaco, hashToken } from "../utils/tokens.js";
import ErroApi from "../utils/ErroApi.js";

const DIAS_VALIDADE = 30;

// Janela de tolerância para reuso de um refresh token recém-revogado. Cobre corrida entre abas ou
// dispositivos e requisições em voo (por exemplo, uma renovação que já tinha saído do cliente um
// instante antes de outra aba revogar o mesmo token). Sem ela, esses casos legítimos disparariam a
// mesma resposta usada contra roubo de token: derrubar todas as sessões do usuário, em todos os
// dispositivos. Fora da janela, um token revogado há mais tempo e apresentado de novo continua
// sendo tratado como reuso genuíno (OWASP A07).
const SEGUNDOS_TOLERANCIA_REUSO = 20;

/**
 * Sessões persistentes com rotação de refresh token.
 *
 * Regras:
 * - o token em claro nunca é armazenado (apenas SHA-256);
 * - cada uso rotaciona o token e revoga o anterior;
 * - reuso de um token revogado há mais de SEGUNDOS_TOLERANCIA_REUSO invalida
 *   toda a família de sessões do usuário (detecção de roubo, OWASP A07);
 *   dentro dessa janela curta, é tratado como corrida legítima (ver
 *   `rotacionar`), nunca como ataque.
 * - a leitura do token usa lock de linha (`SELECT ... FOR UPDATE`) dentro
 *   de uma transação, para que duas requisições concorrentes com o mesmo
 *   token nunca decidam com base no mesmo estado "ainda não revogado":
 *   a segunda espera a primeira terminar e já enxerga o estado atualizado.
 */
class SessaoService {
    /**
     * Mesma distinção do `autenticacaoMiddleware`: bloqueio administrativo tem mensagem própria e
     * um `codigo` que o cliente reconhece; qualquer outro motivo de conta indisponível (`!ativo`
     * sem `bloqueado`, ou usuário inexistente) mantém a mensagem genérica. Fica num só lugar para
     * os dois pontos de `rotacionar` que usam esta checagem nunca divergirem.
     */
    erroContaIndisponivel(usuario) {
        if (usuario?.bloqueado) {
            return ErroApi.acessoNegado(
                usuario.motivoBloqueio
                    ? `Sua conta foi bloqueada pela moderação do ACESSO. Motivo: ${usuario.motivoBloqueio}`
                    : "Sua conta foi bloqueada pela moderação do ACESSO.",
                { codigo: "CONTA_BLOQUEADA" }
            );
        }

        return ErroApi.acessoNegado("Conta indisponível.");
    }

    calcularExpiracao() {
        const data = new Date();
        data.setDate(data.getDate() + DIAS_VALIDADE);

        return data;
    }

    /**
     * Abre uma sessão (um login) ou, com `familia`, a renovação dela. Com `SESSOES_DISPOSITIVOS_HABILITADO`, todas
     * as renovações de um login compartilham `familiaId` e `iniciadaEm`, e `ultimoUsoEm` marca a renovação. Um login
     * novo (sem `familia`) respeita o teto de sessões por conta.
     */
    async emitir(usuarioId, contexto = {}, { transaction, mfaVerificadoEm = null, familia = null, rotacao = false } = {}) {
        const token = gerarTokenOpaco();

        const dados = {
            usuarioId,
            tokenHash: hashToken(token),
            expiraEm: this.calcularExpiracao(),
            userAgent: contexto.userAgent ? String(contexto.userAgent).slice(0, 255) : null,
            ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null,
            mfaVerificadoEm
        };

        if (env.sessoes.dispositivosHabilitado) {
            const id = crypto.randomUUID();
            const agora = new Date();

            Object.assign(dados, {
                id,
                familiaId: familia?.familiaId ?? id,
                iniciadaEm: familia?.iniciadaEm ?? agora,
                ultimoUsoEm: agora
            });
        }

        const registro = await Sessao.create(dados, { transaction });

        if (!rotacao) {
            await this.aplicarLimite(usuarioId, { transaction });
        }

        return { refreshToken: token, registro };
    }

    /** A família (login) de uma sessão existente, para a renovação herdá-la. Nulo sem a migration 0009 ou em linha antiga. */
    familiaDe(registro) {
        if (!env.sessoes.dispositivosHabilitado || !registro?.familiaId) {
            return null;
        }

        return { familiaId: registro.familiaId, iniciadaEm: registro.iniciadaEm };
    }

    /**
     * Teto de sessões ativas por conta (`SESSOES_MAXIMO_POR_CONTA`, padrão 20): ao passar dele, os dispositivos menos
     * recentes são encerrados. Sem isto, quem repetisse o login (ou um script) acumularia sessões sem limite.
     *
     * **Conta dispositivos (famílias), não linhas.** Durante a janela de tolerância de uma renovação (duas abas renovando
     * juntas) o mesmo login pode ter duas linhas ativas; contar linhas fazia o teto encerrar o dispositivo de quem estava
     * usando. Visto na rodada funcional contra banco real. Devolve quantos dispositivos foram encerrados.
     */
    async aplicarLimite(usuarioId, { transaction } = {}) {
        const ativas = await Sessao.findAll({
            where: { usuarioId, revogadaEm: null, expiraEm: { [Op.gt]: new Date() } },
            order: [["criadoEm", "DESC"]],
            attributes: env.sessoes.dispositivosHabilitado ? ["id", "familiaId"] : ["id"],
            transaction
        });

        // Um dispositivo por família (a linha mais recente dela); linha sem família é um dispositivo só dela.
        const vistos = new Set();
        const dispositivos = ativas.filter((sessao) => {
            const chave = sessao.familiaId ?? sessao.id;
            if (vistos.has(chave)) return false;
            vistos.add(chave);
            return true;
        });

        if (dispositivos.length <= env.sessoes.maximoPorConta) {
            return 0;
        }

        const excedentes = dispositivos.slice(env.sessoes.maximoPorConta);
        const familias = excedentes.map((s) => s.familiaId).filter(Boolean);
        const ids = excedentes.filter((s) => !s.familiaId).map((s) => s.id);
        const alvos = [];

        if (familias.length > 0) alvos.push({ familiaId: { [Op.in]: familias } });
        if (ids.length > 0) alvos.push({ id: { [Op.in]: ids } });

        await Sessao.update(
            { revogadaEm: new Date() },
            { where: { usuarioId, revogadaEm: null, [Op.or]: alvos }, transaction }
        );

        return excedentes.length;
    }

    /**
     * Esta sessão (login) continua ativa? É o que faz encerrar uma sessão valer na hora: o access token leva `sid`, e
     * o middleware pergunta aqui a cada requisição. Uma renovação em curso troca a linha dentro de uma transação, então
     * a família nunca fica sem linha ativa no meio dela.
     */
    async familiaViva(usuarioId, familiaId) {
        const viva = await Sessao.findOne({
            where: { familiaId, usuarioId, revogadaEm: null, expiraEm: { [Op.gt]: new Date() } },
            attributes: ["id"]
        });

        return Boolean(viva);
    }

    async revogarTodos(usuarioId, { transaction } = {}) {
        await Sessao.update(
            { revogadaEm: new Date() },
            { where: { usuarioId, revogadaEm: null }, transaction }
        );
    }

    /* Sessões ativas (tela de Configurações) */

    /**
     * Lista as sessões ativas do usuário, uma por login (dispositivo), sinalizando qual é a atual. A atual é a da
     * família do access token (`familiaId`, quando a migration 0009 está em uso) ou a do refresh token informado.
     * `iniciadaEm` e `ultimoUsoEm` são os verdadeiros com a 0009 e, sem ela, caem no `criadoEm` da linha.
     */
    async listarAtivas(usuarioId, { familiaId = null, tokenAtual = null } = {}) {
        const hashAtual = tokenAtual ? hashToken(tokenAtual) : null;

        const registros = await Sessao.findAll({
            where: {
                usuarioId,
                revogadaEm: null,
                expiraEm: { [Op.gt]: new Date() }
            },
            order: [["criadoEm", "DESC"]]
        });

        // Durante a janela de tolerância de uma renovação a família pode ter duas linhas: fica a mais recente.
        const vistos = new Set();
        const unicos = registros.filter((registro) => {
            const chave = registro.familiaId ?? registro.id;
            if (vistos.has(chave)) return false;
            vistos.add(chave);
            return true;
        });

        return unicos.map((registro) => ({
            id: registro.id,
            userAgent: registro.userAgent,
            ip: registro.ip,
            criadoEm: registro.criadoEm,
            iniciadaEm: registro.iniciadaEm ?? registro.criadoEm,
            ultimoUsoEm: registro.ultimoUsoEm ?? registro.criadoEm,
            expiraEm: registro.expiraEm,
            verificadaEmDuasEtapas: Boolean(registro.mfaVerificadoEm),
            atual:
                Boolean(familiaId && registro.familiaId === familiaId) ||
                (hashAtual !== null && registro.tokenHash === hashAtual)
        }));
    }

    /** Revoga uma sessão específica, só se pertencer ao próprio usuário. */
    async revogarPorId(usuarioId, id) {
        const registro = await Sessao.findOne({
            where: { id, usuarioId, revogadaEm: null }
        });

        if (!registro) {
            throw ErroApi.naoEncontrado("Sessão não encontrada.");
        }

        // Com a migration 0009 o login inteiro (todas as renovações) é encerrado, e o access token dele deixa de valer.
        if (registro.familiaId) {
            await Sessao.update(
                { revogadaEm: new Date() },
                { where: { familiaId: registro.familiaId, usuarioId, revogadaEm: null } }
            );
        } else {
            await registro.update({ revogadaEm: new Date() });
        }

        return { mensagem: "Sessão encerrada." };
    }

    /**
     * Revoga todas as sessões do usuário, exceto a atual. A atual vem da família do access token (`familiaId`) ou do
     * refresh token informado. **Sem conseguir identificá-la, recusa**: antes, sem o refresh token no corpo, isto
     * encerrava também a sessão de quem pediu, sem avisar.
     */
    async revogarTodosExceto(usuarioId, { familiaId = null, tokenAtual = null } = {}) {
        let familiaAtual = familiaId;
        let idAtual = null;

        if (!familiaAtual && tokenAtual) {
            const atual = await Sessao.findOne({
                where: { usuarioId, tokenHash: hashToken(tokenAtual), revogadaEm: null }
            });

            familiaAtual = atual?.familiaId ?? null;
            idAtual = atual?.id ?? null;
        }

        if (!familiaAtual && !idAtual) {
            throw ErroApi.requisicaoInvalida(
                "Não foi possível identificar a sessão que você está usando. Entre novamente antes de encerrar as outras.",
                { codigo: "SESSAO_ATUAL_NAO_IDENTIFICADA" }
            );
        }

        const alvo = familiaAtual
            ? { [Op.or]: [{ familiaId: { [Op.ne]: familiaAtual } }, { familiaId: null }] }
            : { id: { [Op.ne]: idAtual } };

        await Sessao.update({ revogadaEm: new Date() }, { where: { usuarioId, revogadaEm: null, ...alvo } });

        return { mensagem: "As outras sessões foram encerradas." };
    }

    async rotacionar(token, contexto = {}) {
        if (!token) {
            throw ErroApi.naoAutenticado("Refresh token não informado.");
        }

        const transaction = await sequelize.transaction();

        try {
            // Lock de linha (SELECT ... FOR UPDATE): se duas requisições
            // concorrentes chegarem com o mesmo token (duas abas, PC e
            // celular expirando quase juntos), a segunda espera a primeira
            // terminar esta transação inteira antes de ler o registro;
            // nunca as duas decidem em cima do mesmo estado "não revogado".
            const registro = await Sessao.findOne({
                where: { tokenHash: hashToken(token) },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!registro) {
                await transaction.rollback();
                throw ErroApi.naoAutenticado("Sessão inválida.");
            }

            if (registro.revogadaEm) {
                // `substituidaPorId` só é preenchido quando este token
                // específico foi individualmente rotacionado (fluxo
                // normal, ou a própria tolerância abaixo), nunca por
                // `revogar` (logout de um token específico) nem por
                // `revogarTodos` (sweep de segurança). Essa é a distinção
                // que importa: só um token que teve uma rotação
                // individual real registrada pode, dentro da janela
                // curta, ser tratado como uma renovação legítima
                // atrasada. Um token morto por logout explícito ou por um
                // sweep anterior nunca ganha tolerância nenhuma:
                // reapresentá-lo não é evidência de nada além de "essa
                // sessão específica já acabou".
                const foiRotacaoIndividual = Boolean(registro.substituidaPorId);
                const segundosDesdeRevogacao =
                    (Date.now() - registro.revogadaEm.getTime()) / 1000;

                if (foiRotacaoIndividual && segundosDesdeRevogacao <= SEGUNDOS_TOLERANCIA_REUSO) {
                    // Dentro da janela de tolerância: trata como uma
                    // renovação legítima que só chegou um pouco atrasada
                    // (aba duplicada, retry de rede, requisição que já
                    // estava em voo); nunca deslogar os outros
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
                        {
                            transaction,
                            mfaVerificadoEm: registro.mfaVerificadoEm,
                            familia: this.familiaDe(registro),
                            rotacao: true
                        }
                    );

                    await transaction.commit();

                    return {
                        usuario: usuarioTolerado,
                        refreshToken: tokenTolerado,
                        mfaVerificadoEm: registro.mfaVerificadoEm,
                        familiaId: registro.familiaId ?? null
                    };
                }

                if (foiRotacaoIndividual) {
                    // Fora da janela de tolerância: reuso de um token que
                    // já foi individualmente substituído há mais tempo;
                    // esse é o sinal real de roubo de token (alguém está
                    // usando uma cópia antiga bem depois do dono ter
                    // seguido em frente). Derruba toda a família de
                    // sessões (OWASP A07).
                    await this.revogarTodos(registro.usuarioId, { transaction });
                    await transaction.commit();
                    throw ErroApi.naoAutenticado("Sessão expirada. Entre novamente.");
                }

                // Revogado por logout explícito daquele token específico,
                // ou por um sweep de segurança anterior: não é evidência
                // de roubo, só um token que já não vale mais nada; não
                // amplifica derrubando mais nenhuma sessão.
                await transaction.rollback();
                throw ErroApi.naoAutenticado("Sessão expirada. Entre novamente.");
            }

            if (registro.expiraEm.getTime() <= Date.now()) {
                await transaction.rollback();
                throw ErroApi.naoAutenticado("Sessão expirada. Entre novamente.");
            }

            const usuario = await Usuario.findByPk(registro.usuarioId, { transaction });

            if (!usuario || usuario.bloqueado || !usuario.ativo) {
                await transaction.rollback();
                throw this.erroContaIndisponivel(usuario);
            }

            // A verificação do segundo fator acompanha a sessão na renovação.
            const { refreshToken, registro: novo } = await this.emitir(
                usuario.id,
                contexto,
                {
                    transaction,
                    mfaVerificadoEm: registro.mfaVerificadoEm,
                    familia: this.familiaDe(registro),
                    rotacao: true
                }
            );

            await registro.update(
                { revogadaEm: new Date(), substituidaPorId: novo.id },
                { transaction }
            );

            await transaction.commit();

            return {
                usuario,
                refreshToken,
                mfaVerificadoEm: registro.mfaVerificadoEm,
                familiaId: registro.familiaId ?? null
            };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            throw erro;
        }
    }

    /**
     * Logout. Com a migration 0009, encerra o login inteiro (a família do token, ou a do access token de quem pediu),
     * para o access token dele também deixar de valer na hora.
     */
    async revogar(token, { usuarioId = null, familiaId = null } = {}) {
        if (!token && !familiaId) {
            return { mensagem: "Sessão encerrada." };
        }

        let familia = familiaId;
        let dono = usuarioId;

        if (token) {
            const registro = await Sessao.findOne({ where: { tokenHash: hashToken(token), revogadaEm: null } });

            if (registro) {
                familia = registro.familiaId ?? familia;
                dono = registro.usuarioId;

                if (!registro.familiaId) {
                    await registro.update({ revogadaEm: new Date() });
                }
            }
        }

        if (familia && dono) {
            await Sessao.update({ revogadaEm: new Date() }, { where: { familiaId: familia, usuarioId: dono, revogadaEm: null } });
        }

        return { mensagem: "Sessão encerrada." };
    }

    async limparExpirados() {
        return Sessao.destroy({
            where: { expiraEm: { [Op.lt]: new Date() } }
        });
    }

    /**
     * Limpeza periódica (`server.js`). Cada renovação do refresh token revoga uma linha e cria outra, então sem isto a
     * tabela cresce sem limite (antes, `limparExpirados` nunca era chamada). Apaga as vencidas há mais de 1 dia e as
     * revogadas há mais de 7: a detecção de reuso de token (que precisa da linha revogada) segue valendo por uma semana.
     */
    async limparAntigas({ agora = Date.now() } = {}) {
        const DIA = 24 * 60 * 60 * 1000;

        return Sessao.destroy({
            where: {
                [Op.or]: [
                    { expiraEm: { [Op.lt]: new Date(agora - DIA) } },
                    { revogadaEm: { [Op.lt]: new Date(agora - 7 * DIA) } }
                ]
            }
        });
    }
}

export default new SessaoService();
