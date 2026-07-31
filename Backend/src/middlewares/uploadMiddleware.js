import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

/**
 * Upload de imagens.
 *
 * Proteções aplicadas (OWASP A04/A08):
 * - nome de arquivo gerado no servidor (evita path traversal via originalname);
 * - extensão derivada de uma allowlist, nunca do nome enviado pelo cliente;
 * - limite de tamanho e de quantidade de arquivos;
 * - diretório de destino criado fora da árvore de código-fonte.
 */

const EXTENSOES_PERMITIDAS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp"
};

const destino = path.resolve(process.cwd(), env.security.uploadDir);

if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, destino);
    },

    filename(req, file, cb) {
        const extensao = EXTENSOES_PERMITIDAS[file.mimetype];

        if (!extensao) {
            return cb(ApiError.badRequest("Formato de arquivo inválido."));
        }

        const nome = `${Date.now()}-${crypto.randomUUID()}${extensao}`;

        return cb(null, nome);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: env.security.maxUploadBytes,
        files: 1
    },

    fileFilter(req, file, cb) {
        if (!EXTENSOES_PERMITIDAS[file.mimetype]) {
            return cb(
                ApiError.badRequest(
                    "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP."
                )
            );
        }

        return cb(null, true);
    }
});

export default upload;
