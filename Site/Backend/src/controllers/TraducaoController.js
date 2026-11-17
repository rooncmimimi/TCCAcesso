import TraducaoService from "../services/TraducaoService.js";

/** Tradução de conteúdo público (`POST /traducoes`). */
class TraducaoController {
    async traduzir(req, res, next) {
        try {
            // Só estes três campos seguem para o serviço, nada mais do corpo da requisição.
            const { textos, origem, destino } = req.body;
            const resultado = await TraducaoService.traduzir({ textos, origem, destino });

            return res.status(200).json({
                sucesso: true,
                textos: resultado.textos,
                motor: resultado.motor,
                // Quantos vieram prontos do banco: útil para conferir que o cache está funcionando.
                doCache: resultado.doCache
            });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new TraducaoController();
