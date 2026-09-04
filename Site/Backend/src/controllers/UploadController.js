import UploadService from "../services/UploadService.js";

class UploadController {
    async documento(req, res, next) {
        try {
            const categoria = req.body.categoria || "documento";

            const dados = await UploadService.registrar(
                req.file,
                categoria,
                req.user
            );

            return res.status(201).json({ sucesso: true, arquivo: dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new UploadController();
