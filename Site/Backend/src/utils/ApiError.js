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

    static serviceUnavailable(mensagem = "Serviço temporariamente indisponível.") {
        return new ApiError(503, mensagem);
    }

    /**
     * Erro interno (500) com mensagem amigável para o cliente, preservando
     * o erro original (`causaOriginal`) apenas para log — nunca é enviado
     * na resposta HTTP. Use quando uma falha inesperada (ex.: erro de
     * banco de dados) precisa virar uma mensagem específica para o
     * usuário, sem esconder a causa raiz dos logs do servidor.
     */
    static interno(mensagem = "Erro interno do servidor.", causaOriginal = null) {
        const erro = new ApiError(500, mensagem);
        erro.causaOriginal = causaOriginal;
        return erro;
    }
}

export default ApiError;
