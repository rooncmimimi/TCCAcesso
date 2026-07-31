import PostagemService from "../services/PostagemService.js";

class PostagemController {
    async index(req, res, next) {
        try {
            const dados = await PostagemService.findAll(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const postagem = await PostagemService.findById(req.params.id);

            return res.status(200).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async store(req, res, next) {
        try {
            const imagem = req.file ? `/uploads/${req.file.filename}` : undefined;

            const postagem = await PostagemService.create(
                { ...req.body, ...(imagem ? { imagem } : {}) },
                req.user
            );

            return res.status(201).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async update(req, res, next) {
        try {
            const postagem = await PostagemService.update(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await PostagemService.delete(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new PostagemController();
