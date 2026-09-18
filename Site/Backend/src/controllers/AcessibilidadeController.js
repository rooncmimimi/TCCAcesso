import AcessibilidadeService from "../services/AcessibilidadeService.js";

/**
 * Preferências de acessibilidade do usuário autenticado: `GET` e `PUT /acessibilidade`, e
 * `POST /acessibilidade/reset`, que volta aos valores padrão.
 */
class AcessibilidadeController {
    async obter(req, res, next) {
        try {
            const preferencias = await AcessibilidadeService.obter(req.user.id);

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const preferencias = await AcessibilidadeService.atualizar(
                req.user.id,
                req.body
            );

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }

    async restaurar(req, res, next) {
        try {
            const preferencias = await AcessibilidadeService.restaurarPadrao(
                req.user.id
            );

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AcessibilidadeController();
