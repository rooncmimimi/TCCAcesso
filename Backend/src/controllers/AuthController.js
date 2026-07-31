import authService from "../services/authService.js";

/**
 * Controller de autenticação — apenas orquestra requisição/resposta.
 * Toda a regra de negócio vive em authService.
 */
class AuthController {
    async registerCandidate(req, res, next) {
        try {
            const resultado = await authService.registerCandidate(req.body);

            return res.status(201).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async registerCompany(req, res, next) {
        try {
            const resultado = await authService.registerCompany(req.body);

            return res.status(201).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async login(req, res, next) {
        try {
            const { email, senha } = req.body;
            const resultado = await authService.login(email, senha);

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

    /**
     * Com JWT stateless o logout é feito no cliente (descarte do token).
     * Mantido para padronizar o contrato consumido pelo frontend.
     */
    async logout(req, res) {
        return res
            .status(200)
            .json({ sucesso: true, mensagem: "Sessão encerrada." });
    }
}

export default new AuthController();
