import VagaService from "../services/VagaService.js";

const contextoDa = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

class VagaController {
    async index(req, res, next) {
        try {
            const dados = await VagaService.findAll(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async minhas(req, res, next) {
        try {
            const dados = await VagaService.findByEmpresaAutenticada(
                req.user.id,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const vaga = await VagaService.findById(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async store(req, res, next) {
        try {
            const vaga = await VagaService.create(req.body, req.user);

            return res.status(201).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async update(req, res, next) {
        try {
            const vaga = await VagaService.update(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async alterarStatus(req, res, next) {
        try {
            const vaga = await VagaService.alterarStatus(
                req.params.id,
                req.body.status,
                req.user,
                contextoDa(req)
            );

            return res.status(200).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async estatisticas(req, res, next) {
        try {
            const dados = await VagaService.estatisticas(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await VagaService.delete(
                req.params.id,
                req.user,
                contextoDa(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new VagaController();
