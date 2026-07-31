import CandidaturaService from "../services/CandidaturaService.js";

class CandidaturaController {
    async store(req, res, next) {
        try {
            const candidatura = await CandidaturaService.create(
                req.params.vagaId,
                req.body.mensagem,
                req.user
            );

            return res.status(201).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }

    async minhas(req, res, next) {
        try {
            const dados = await CandidaturaService.listarDoCandidato(
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async porVaga(req, res, next) {
        try {
            const dados = await CandidaturaService.listarDaVaga(
                req.params.vagaId,
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const candidatura = await CandidaturaService.findById(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarStatus(req, res, next) {
        try {
            const candidatura = await CandidaturaService.atualizarStatus(
                req.params.id,
                req.body.status,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }

    async cancelar(req, res, next) {
        try {
            const candidatura = await CandidaturaService.cancelar(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new CandidaturaController();
