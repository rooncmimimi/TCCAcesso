import { validationResult } from "express-validator";

/**
 * Interrompe a requisição quando a validação (express-validator) falha.
 * Deve ser registrado SEMPRE depois dos validadores da rota.
 */
export default function validationMiddleware(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            sucesso: false,
            mensagem: "Erro de validação.",
            erros: errors.array().map((erro) => ({
                campo: erro.path || erro.param,
                mensagem: erro.msg
            }))
        });
    }

    return next();
}
