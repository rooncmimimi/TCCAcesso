import UsuarioService from "../services/UsuarioService.js";

class UsuarioController {
    async index(req, res, next) {
        try {
            const dados = await UsuarioService.findAll(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const usuario = await UsuarioService.findById(req.params.id);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async update(req, res, next) {
        try {
            const usuario = await UsuarioService.update(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async updateFoto(req, res, next) {
        try {
            const fotoPerfil = req.file ? `/uploads/${req.file.filename}` : null;

            const usuario = await UsuarioService.update(
                req.params.id,
                { fotoPerfil },
                req.user
            );

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async updateCapa(req, res, next) {
        try {
            const capaPerfil = req.file ? `/uploads/${req.file.filename}` : null;

            const usuario = await UsuarioService.update(
                req.params.id,
                { capaPerfil },
                req.user
            );

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async activate(req, res, next) {
        try {
            const usuario = await UsuarioService.activate(req.params.id);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async deactivate(req, res, next) {
        try {
            const usuario = await UsuarioService.deactivate(req.params.id);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await UsuarioService.delete(req.params.id);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new UsuarioController();
