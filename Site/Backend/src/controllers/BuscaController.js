import BuscaService from "../services/BuscaService.js";

/**
 * `GET /busca`: o parâmetro `tipo` escolhe entre o resumo de todas as categorias e uma categoria
 * paginada.
 */
class BuscaController {
    async listar(req, res, next) {
        try {
            const dados = await BuscaService.buscar(req.query, req.user);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new BuscaController();
