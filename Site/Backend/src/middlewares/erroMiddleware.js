import multer from "multer";
import {
    ValidationError,
    UniqueConstraintError,
    ForeignKeyConstraintError,
    DatabaseError
} from "sequelize";
import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";

/**
 * Tratamento global de erros.
 *
 * Traduz erros conhecidos (ErroApi, Sequelize, Multer) em respostas HTTP adequadas e nunca expõe
 * stack trace ou detalhes internos do banco em produção (OWASP A05 - Security Misconfiguration).
 *
 * O corpo da resposta tem sempre o mesmo formato: `mensagem` com o texto pronto para exibir,
 * `erros` com a lista de campos inválidos (`{ campo, mensagem }`, igual à do `validacaoMiddleware`)
 * e `detalhes` só para códigos que o cliente compara, como `CONTA_BLOQUEADA`.
 */
const erroMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = 500;
    let mensagem = "Erro interno do servidor.";
    let detalhes;
    let erros;

    if (err instanceof ErroApi) {
        statusCode = err.statusCode;
        mensagem = err.message;
        detalhes = err.detalhes ?? undefined;
    } else if (err instanceof UniqueConstraintError) {
        statusCode = 409;
        mensagem = "Registro duplicado.";
        erros = err.errors?.map((e) => ({
            campo: e.path,
            mensagem: "Este valor já está em uso."
        }));
    } else if (err instanceof ForeignKeyConstraintError) {
        statusCode = 409;
        mensagem = "Operação viola a integridade referencial.";
    } else if (err instanceof ValidationError) {
        statusCode = 422;
        mensagem = "Erro de validação.";
        erros = err.errors?.map((e) => ({
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

    // Quando o erro é uma mensagem amigável que embrulha uma causa raiz
    // (ErroApi.interno), o log usa a causa original (nunca a mensagem
    // amigável) para não perder informação de diagnóstico.
    const causaOriginal = err.causaOriginal ?? null;
    const erroParaLog = causaOriginal ?? err;

    // Log estruturado no servidor (nunca enviado ao cliente).
    const log = {
        nivel: statusCode >= 500 ? "error" : "warn",
        metodo: req.method,
        rota: req.originalUrl,
        usuarioId: req.user?.id ?? null,
        statusCode,
        mensagem: err.message,
        ...(causaOriginal ? { causaOriginal: causaOriginal.message } : {})
    };

    if (statusCode >= 500) {
        console.error(JSON.stringify(log), erroParaLog.stack);
    } else {
        console.warn(JSON.stringify(log));
    }

    return res.status(statusCode).json({
        sucesso: false,
        mensagem,
        ...(erros?.length ? { erros } : {}),
        ...(detalhes ? { detalhes } : {}),
        ...(env.isProducao ? {} : { stack: err.stack })
    });
};

export default erroMiddleware;
