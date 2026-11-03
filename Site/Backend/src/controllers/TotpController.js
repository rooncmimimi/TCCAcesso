import TotpService from "../services/TotpService.js";
import AutenticacaoService from "../services/AutenticacaoService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Rotas de `/auth/totp`: estado, configuração e ativação, códigos de recuperação e desativação da
 * verificação em duas etapas. O segundo passo do login (`POST /auth/login/totp`) fica no
 * `AutenticacaoController`.
 *
 * As respostas que levam segredo ou códigos de recuperação saem com `Cache-Control: no-store`.
 */
const semCache = (res) => res.set("Cache-Control", "no-store");

class TotpController {
    async estado(req, res, next) {
        try {
            const estado = await TotpService.estado(req.user);

            return res.status(200).json({ sucesso: true, ...estado });
        } catch (erro) {
            return next(erro);
        }
    }

    async iniciar(req, res, next) {
        try {
            const configuracao = await TotpService.iniciarConfiguracao(req.user, {
                senhaAtual: req.body.senhaAtual,
                codigo: req.body.codigo
            });

            semCache(res);

            return res.status(200).json({ sucesso: true, ...configuracao });
        } catch (erro) {
            return next(erro);
        }
    }

    async ativar(req, res, next) {
        try {
            const contexto = contextoRequisicao(req);
            const { codigosRecuperacao, mfaVerificadoEm } = await TotpService.ativar(req.user, req.body, contexto);

            // Ativar encerra as outras sessões da conta; este aparelho recebe uma sessão nova, já verificada.
            const sessao = await AutenticacaoService.emitirSessaoVerificada(req.user, contexto, mfaVerificadoEm);

            semCache(res);

            return res.status(200).json({ sucesso: true, codigosRecuperacao, ...sessao });
        } catch (erro) {
            return next(erro);
        }
    }

    async regenerarCodigos(req, res, next) {
        try {
            const resultado = await TotpService.regenerarCodigosDeRecuperacao(
                req.user,
                { senhaAtual: req.body.senhaAtual, codigo: req.body.codigo },
                contextoRequisicao(req)
            );

            semCache(res);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async desativar(req, res, next) {
        try {
            const resultado = await TotpService.desativar(
                req.user,
                { senhaAtual: req.body.senhaAtual, codigo: req.body.codigo },
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new TotpController();
