import AdminService from "../services/AdminService.js";

class AdminController {
    async empresas(req, res, next) {
        try {
            const dados = await AdminService.listarEmpresas(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async aprovarEmpresa(req, res, next) {
        try {
            const empresa = await AdminService.avaliarEmpresa(
                req.params.id,
                { aprovada: true },
                req.user
            );
            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async reprovarEmpresa(req, res, next) {
        try {
            const empresa = await AdminService.avaliarEmpresa(
                req.params.id,
                { aprovada: false, motivo: req.body.motivo },
                req.user
            );
            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async usuarios(req, res, next) {
        try {
            const dados = await AdminService.listarUsuarios(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async bloquearUsuario(req, res, next) {
        try {
            const dados = await AdminService.alternarBloqueio(
                req.params.id,
                req.body,
                req.user
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerUsuario(req, res, next) {
        try {
            const dados = await AdminService.removerUsuario(
                req.params.id,
                req.user
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async postagens(req, res, next) {
        try {
            const dados = await AdminService.listarPostagens(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerPostagem(req, res, next) {
        try {
            const dados = await AdminService.removerPostagem(req.params.id);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerComentario(req, res, next) {
        try {
            const dados = await AdminService.removerComentario(req.params.id);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async vagas(req, res, next) {
        try {
            const dados = await AdminService.listarVagas(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async ocultarVaga(req, res, next) {
        try {
            const dados = await AdminService.alternarVisibilidadeVaga(
                req.params.id,
                req.body.oculta
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async relatorios(req, res, next) {
        try {
            const dados = await AdminService.relatorios();
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AdminController();
