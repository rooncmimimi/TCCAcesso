import MinhaAcessibilidadeService from "../services/MinhaAcessibilidadeService.js";

/**
 * "Minha Acessibilidade": perfil de adaptações, preferências de comunicação e a escolha de exibir a
 * categoria de deficiência no perfil. Sempre da própria pessoa (`req.user`), nunca por id da URL.
 */
class MinhaAcessibilidadeController {
    catalogo(req, res) {
        return res.status(200).json({ sucesso: true, catalogo: MinhaAcessibilidadeService.catalogo() });
    }

    async obter(req, res, next) {
        try {
            const minha = await MinhaAcessibilidadeService.obter(req.user);

            return res.status(200).json({ sucesso: true, minhaAcessibilidade: minha });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarAdaptacoes(req, res, next) {
        try {
            const minha = await MinhaAcessibilidadeService.atualizarAdaptacoes(req.user, req.body);

            return res.status(200).json({ sucesso: true, minhaAcessibilidade: minha });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarComunicacao(req, res, next) {
        try {
            const minha = await MinhaAcessibilidadeService.atualizarComunicacao(req.user, req.body);

            return res.status(200).json({ sucesso: true, minhaAcessibilidade: minha });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarPrivacidade(req, res, next) {
        try {
            const minha = await MinhaAcessibilidadeService.atualizarPrivacidade(req.user, req.body);

            return res.status(200).json({ sucesso: true, minhaAcessibilidade: minha });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new MinhaAcessibilidadeController();
