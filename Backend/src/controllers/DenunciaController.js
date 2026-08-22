import DenunciaService from "../services/DenunciaService.js";

const contextoDa = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

class DenunciaController {
    async criar(req, res, next) {
        try {
            const denuncia = await DenunciaService.criar(req.body, req.user);
            return res.status(201).json({ sucesso: true, denuncia });
        } catch (erro) {
            return next(erro);
        }
    }

    async listar(req, res, next) {
        try {
            const dados = await DenunciaService.listar(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async detalhe(req, res, next) {
        try {
            const denuncia = await DenunciaService.detalhe(req.params.id);
            return res.status(200).json({ sucesso: true, denuncia });
        } catch (erro) {
            return next(erro);
        }
    }

    async contextoMensagem(req, res, next) {
        try {
            const contexto = await DenunciaService.obterContextoMensagem(
                req.params.id,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, ...contexto });
        } catch (erro) {
            return next(erro);
        }
    }

    async atribuir(req, res, next) {
        try {
            const denuncia = await DenunciaService.atribuir(
                req.params.id,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, denuncia });
        } catch (erro) {
            return next(erro);
        }
    }

    async resolver(req, res, next) {
        try {
            const denuncia = await DenunciaService.resolver(
                req.params.id,
                req.body,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, denuncia });
        } catch (erro) {
            return next(erro);
        }
    }

    async rejeitar(req, res, next) {
        try {
            const denuncia = await DenunciaService.rejeitar(
                req.params.id,
                req.body,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, denuncia });
        } catch (erro) {
            return next(erro);
        }
    }

    async arquivar(req, res, next) {
        try {
            const denuncia = await DenunciaService.arquivar(
                req.params.id,
                req.body,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, denuncia });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new DenunciaController();
