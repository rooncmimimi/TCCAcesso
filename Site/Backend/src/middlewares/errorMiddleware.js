import multer from "multer";
import {
    ValidationError,
    UniqueConstraintError,
    ForeignKeyConstraintError,
    DatabaseError
} from "sequelize";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

/**
 * Tratamento global de erros.
 *
 * Traduz erros conhecidos (ApiError, Sequelize, Multer) em respostas
 * HTTP adequadas e NUNCA expõe stack trace ou detalhes internos do
 * banco em produção (OWASP A05 - Security Misconfiguration).
 */
const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = 500;
    let mensagem = "Erro interno do servidor.";
    let detalhes;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        mensagem = err.message;
        detalhes = err.detalhes ?? undefined;
    } else if (err instanceof UniqueConstraintError) {
        statusCode = 409;
        mensagem = "Registro duplicado.";
        detalhes = err.errors?.map((e) => e.path);
    } else if (err instanceof ForeignKeyConstraintError) {
        statusCode = 409;
        mensagem = "Operação viola a integridade referencial.";
    } else if (err instanceof ValidationError) {
        statusCode = 422;
        mensagem = "Erro de validação.";
        detalhes = err.errors?.map((e) => ({
            campo: e.path,
            mensagem: e.message
        }));
    } else if (err instanceof multer.MulterError) {
        statusCode = 400;
        mensagem =
            err.code === "LIMIT_FILE_SIZE"
                ? "Arquivo excede o tamanho máximo permitido."
                : "Falha no upload do arquivo.";
    } else if (err instanceof DatabaseError) {
        statusCode = 500;
        mensagem = "Erro ao consultar o banco de dados.";
    }

    // Log estruturado no servidor (nunca enviado ao cliente).
    const log = {
        nivel: statusCode >= 500 ? "error" : "warn",
        metodo: req.method,
        rota: req.originalUrl,
        usuarioId: req.user?.id ?? null,
        statusCode,
        mensagem: err.message
    };

    if (statusCode >= 500) {
        console.error(JSON.stringify(log), err.stack);
    } else {
        console.warn(JSON.stringify(log));
    }

    return res.status(statusCode).json({
        sucesso: false,
        mensagem,
        ...(detalhes ? { detalhes } : {}),
        ...(env.isProducao ? {} : { stack: err.stack })
    });
};

export default errorMiddleware;
