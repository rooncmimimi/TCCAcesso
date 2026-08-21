import QRCode from "qrcode";

import { Usuario, AutenticacaoDoisFatores } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { comparePassword } from "../utils/bcrypt.js";
import { criptografar, descriptografar } from "../utils/criptografia.js";
import {
    gerarSegredoBase32,
    gerarUriOtpAuth,
    verificarCodigoTotp
} from "../utils/totp.js";

/**
 * Autenticação de dois fatores (2FA) por TOTP.
 *
 * Fluxo de ativação em duas etapas (nunca ativa direto):
 * 1) `iniciarAtivacao` — confirma a senha atual, gera um segredo novo,
 *    persiste cifrado com `ativado = false` (pendente de confirmação).
 * 2) `confirmarAtivacao` — usuário informa o código gerado pelo app;
 *    só então `ativado` vira `true`.
 */
class AutenticacaoDoisFatoresService {
    async confirmarSenha(usuarioId, senhaAtual) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        const confere = await comparePassword(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ApiError.unauthorized("Senha atual incorreta.");
        }

        return usuario;
    }

    /** Status exposto ao frontend — nunca inclui o segredo. */
    async status(usuarioId) {
        const registro = await AutenticacaoDoisFatores.findOne({
            where: { usuarioId }
        });

        return {
            ativado: Boolean(registro?.ativado),
            metodo: registro?.metodo ?? "totp",
            ativadoEm: registro?.ativadoEm ?? null
        };
    }

    /** Usado no login — nunca exposto por rota HTTP direta. */
    async possuiDoisFatoresAtivo(usuarioId) {
        const registro = await AutenticacaoDoisFatores.findOne({
            where: { usuarioId, ativado: true }
        });

        return Boolean(registro);
    }

    async verificarCodigoLogin(usuarioId, codigo) {
        const registro = await AutenticacaoDoisFatores.scope(
            "comSegredo"
        ).findOne({ where: { usuarioId, ativado: true } });

        if (!registro || !registro.segredoTotp) {
            return false;
        }

        const segredo = descriptografar(registro.segredoTotp);

        return verificarCodigoTotp(segredo, codigo);
    }

    async iniciarAtivacao(usuario, senhaAtual) {
        await this.confirmarSenha(usuario.id, senhaAtual);

        const existente = await AutenticacaoDoisFatores.findOne({
            where: { usuarioId: usuario.id }
        });

        if (existente?.ativado) {
            throw ApiError.conflict(
                "A autenticação de dois fatores já está ativada nesta conta."
            );
        }

        const segredo = gerarSegredoBase32();

        if (existente) {
            await existente.update({
                metodo: "totp",
                segredoTotp: criptografar(segredo),
                ativado: false,
                ativadoEm: null
            });
        } else {
            await AutenticacaoDoisFatores.create({
                usuarioId: usuario.id,
                metodo: "totp",
                segredoTotp: criptografar(segredo),
                ativado: false
            });
        }

        const uri = gerarUriOtpAuth(segredo, usuario.email);
        const qrCodeDataUrl = await QRCode.toDataURL(uri);

        return { segredo, uri, qrCodeDataUrl };
    }

    async confirmarAtivacao(usuarioId, codigo) {
        const registro = await AutenticacaoDoisFatores.scope(
            "comSegredo"
        ).findOne({ where: { usuarioId } });

        if (!registro || !registro.segredoTotp) {
            throw ApiError.badRequest(
                "Nenhuma ativação de dois fatores pendente. Inicie o processo novamente."
            );
        }

        if (registro.ativado) {
            throw ApiError.conflict(
                "A autenticação de dois fatores já está ativada nesta conta."
            );
        }

        const segredo = descriptografar(registro.segredoTotp);

        if (!verificarCodigoTotp(segredo, codigo)) {
            throw ApiError.badRequest("Código de verificação inválido.");
        }

        await registro.update({ ativado: true, ativadoEm: new Date() });

        return { ativado: true };
    }

    async desativar(usuario, senhaAtual) {
        await this.confirmarSenha(usuario.id, senhaAtual);

        const registro = await AutenticacaoDoisFatores.findOne({
            where: { usuarioId: usuario.id }
        });

        if (!registro || !registro.ativado) {
            throw ApiError.badRequest(
                "A autenticação de dois fatores não está ativada nesta conta."
            );
        }

        await registro.update({
            ativado: false,
            ativadoEm: null,
            segredoTotp: null
        });

        return { ativado: false };
    }
}

export default new AutenticacaoDoisFatoresService();
