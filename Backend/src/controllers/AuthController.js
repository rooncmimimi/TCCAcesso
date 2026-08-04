import authService from "../services/authService.js";
import RecuperacaoSenhaService from "../services/RecuperacaoSenhaService.js";

/**
 * Controller de autenticação — apenas orquestra requisição/resposta.
 * Toda a regra de negócio vive nos services.
 */
const contextoDa = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

class AuthController {
    async registerCandidate(req, res, next) {
        try {
            const resultado = await authService.registerCandidate(
                req.body,
                contextoDa(req)
            );

            return res.status(201).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async registerCompany(req, res, next) {
        try {
            const resultado = await authService.registerCompany(
                req.body,
                contextoDa(req)
            );

            return res.status(201).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async login(req, res, next) {
        try {
            const { email, senha } = req.body;
            const resultado = await authService.login(
                email,
                senha,
                contextoDa(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async refresh(req, res, next) {
        try {
            const resultado = await authService.refresh(
                req.body.refreshToken,
                contextoDa(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async me(req, res, next) {
        try {
            const usuario = await authService.me(req.user.id);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async alterarSenha(req, res, next) {
        try {
            const { senhaAtual, novaSenha } = req.body;
            const resultado = await authService.alterarSenha(
                req.user.id,
                senhaAtual,
                novaSenha
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async esqueciSenha(req, res, next) {
        try {
            const resultado = await RecuperacaoSenhaService.solicitar(
                req.body.email,
                contextoDa(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async redefinirSenha(req, res, next) {
        try {
            const resultado = await RecuperacaoSenhaService.redefinir(req.body);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Revoga o refresh token da sessão atual. */
    async logout(req, res, next) {
        try {
            const resultado = await authService.logout(req.body?.refreshToken);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AuthController();
