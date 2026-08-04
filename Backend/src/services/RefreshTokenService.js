import { Op } from "sequelize";
import { RefreshToken, Usuario } from "../models/index.js";
import { gerarTokenOpaco, hashToken } from "../utils/tokens.js";
import ApiError from "../utils/ApiError.js";

const DIAS_VALIDADE = 30;

/**
 * Sessões persistentes com rotação de refresh token.
 *
 * Regras:
 * - o token em claro nunca é armazenado (apenas SHA-256);
 * - cada uso rotaciona o token e revoga o anterior;
 * - reuso de token revogado invalida toda a família de sessões do usuário
 *   (detecção de roubo de token — OWASP A07).
 */
class RefreshTokenService {
    calcularExpiracao() {
        const data = new Date();
        data.setDate(data.getDate() + DIAS_VALIDADE);

        return data;
    }

    async emitir(usuarioId, contexto = {}) {
        const token = gerarTokenOpaco();

        const registro = await RefreshToken.create({
            usuarioId,
            tokenHash: hashToken(token),
            expiraEm: this.calcularExpiracao(),
            userAgent: contexto.userAgent
                ? String(contexto.userAgent).slice(0, 255)
                : null,
            ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null
        });

        return { refreshToken: token, registro };
    }

    async revogarTodos(usuarioId) {
        await RefreshToken.update(
            { revogadoEm: new Date() },
            { where: { usuarioId, revogadoEm: null } }
        );
    }

    async rotacionar(token, contexto = {}) {
        if (!token) {
            throw ApiError.unauthorized("Refresh token não informado.");
        }

        const registro = await RefreshToken.findOne({
            where: { tokenHash: hashToken(token) }
        });

        if (!registro) {
            throw ApiError.unauthorized("Sessão inválida.");
        }

        if (registro.revogadoEm) {
            // Reuso detectado: encerra todas as sessões do usuário.
            await this.revogarTodos(registro.usuarioId);
            throw ApiError.unauthorized("Sessão expirada. Entre novamente.");
        }

        if (registro.expiraEm.getTime() <= Date.now()) {
            throw ApiError.unauthorized("Sessão expirada. Entre novamente.");
        }

        const usuario = await Usuario.findByPk(registro.usuarioId);

        if (!usuario || !usuario.ativo || usuario.bloqueado) {
            throw ApiError.forbidden("Conta indisponível.");
        }

        const { refreshToken, registro: novo } = await this.emitir(
            usuario.id,
            contexto
        );

        await registro.update({
            revogadoEm: new Date(),
            substituidoPor: novo.id
        });

        return { usuario, refreshToken };
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
