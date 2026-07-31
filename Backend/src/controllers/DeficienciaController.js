import DeficienciaService from "../services/DeficienciaService.js";

class DeficienciaController {
    async index(req, res, next) {
        try {
            const deficiencias = await DeficienciaService.findAll();

            return res.status(200).json({ sucesso: true, deficiencias });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const deficiencia = await DeficienciaService.findById(req.params.id);

            return res.status(200).json({ sucesso: true, deficiencia });
        } catch (erro) {
            return next(erro);
        }
    }

    async store(req, res, next) {
        try {
            const deficiencia = await DeficienciaService.create(req.body);

            return res.status(201).json({ sucesso: true, deficiencia });
        } catch (erro) {
            return next(erro);
        }
    }

    async update(req, res, next) {
        try {
            const deficiencia = await DeficienciaService.update(
                req.params.id,
                req.body
            );

            return res.status(200).json({ sucesso: true, deficiencia });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await DeficienciaService.delete(req.params.id);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new DeficienciaController();
