/**
 * Erro de aplicação com status HTTP.
 *
 * Sempre lance ApiError nos Services. O errorMiddleware usa
 * `statusCode` para responder corretamente e trata qualquer
 * outro erro como 500 (sem vazar detalhes internos).
 */
class ApiError extends Error {
    constructor(statusCode, message, detalhes = null) {
        super(message);

        this.name = "ApiError";
        this.statusCode = statusCode;
        this.detalhes = detalhes;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(mensagem, detalhes) {
        return new ApiError(400, mensagem, detalhes);
    }

    static unauthorized(mensagem = "Não autenticado.") {
        return new ApiError(401, mensagem);
    }

    static forbidden(mensagem = "Acesso negado.") {
        return new ApiError(403, mensagem);
    }

    static notFound(mensagem = "Recurso não encontrado.") {
        return new ApiError(404, mensagem);
    }

    static conflict(mensagem) {
        return new ApiError(409, mensagem);
    }
}

export default ApiError;
