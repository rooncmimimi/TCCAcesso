import EmpresaService from "../services/EmpresaService.js";

class EmpresaController {
    async index(req, res, next) {
        try {
            const dados = await EmpresaService.findAll(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async partners(req, res, next) {
        try {
            const empresas = await EmpresaService.findPartners();

            return res.status(200).json({ sucesso: true, empresas });
        } catch (erro) {
            return next(erro);
        }
    }

    async me(req, res, next) {
        try {
            const empresa = await EmpresaService.findByUsuario(req.user.id);

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async porUsuario(req, res, next) {
        try {
            const empresa = await EmpresaService.findByUsuarioPublico(req.params.usuarioId);

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const empresa = await EmpresaService.findById(req.params.id);

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async update(req, res, next) {
        try {
            const empresa = await EmpresaService.update(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async uploadLogo(req, res, next) {
        try {
            const logo = req.file ? `/uploads/${req.file.filename}` : null;

            const empresa = await EmpresaService.update(
                req.params.id,
                { logo },
                req.user
            );

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async uploadCapa(req, res, next) {
        try {
            const capa = req.file ? `/uploads/${req.file.filename}` : null;

            const empresa = await EmpresaService.update(
                req.params.id,
                { capa },
                req.user
            );

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await EmpresaService.delete(req.params.id);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new EmpresaController();
