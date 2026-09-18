import DeficienciaService from "../services/DeficienciaService.js";

/** Catálogo de deficiências (`/deficiencias`); criar, editar e excluir são só do administrador. */
class DeficienciaController {
    async listar(req, res, next) {
        try {
            const deficiencias = await DeficienciaService.listar();

            return res.status(200).json({ sucesso: true, deficiencias });
        } catch (erro) {
            return next(erro);
        }
    }

    async obter(req, res, next) {
        try {
            const deficiencia = await DeficienciaService.buscarPorId(req.params.id);

            return res.status(200).json({ sucesso: true, deficiencia });
        } catch (erro) {
            return next(erro);
        }
    }

    async criar(req, res, next) {
        try {
            const deficiencia = await DeficienciaService.criar(req.body);

            return res.status(201).json({ sucesso: true, deficiencia });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const deficiencia = await DeficienciaService.atualizar(
                req.params.id,
                req.body
            );

            return res.status(200).json({ sucesso: true, deficiencia });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await DeficienciaService.excluir(req.params.id);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new DeficienciaController();
