import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

/**
 * Uploads da plataforma.
 *
 * Proteções aplicadas (OWASP A04/A08):
 * - nome de arquivo gerado no servidor (evita path traversal via originalname);
 * - extensão derivada de uma allowlist, nunca do nome enviado pelo cliente;
 * - limite de tamanho e de quantidade de arquivos;
 * - diretório de destino criado fora da árvore de código-fonte.
 */

export const MIME_IMAGENS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp"
};

export const MIME_DOCUMENTOS = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx"
};

const destino = path.resolve(process.cwd(), env.security.uploadDir);

if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
}

const criarUpload = (allowlist, { files = 1, mensagem } = {}) => {
    const storage = multer.diskStorage({
        destination(req, file, cb) {
            cb(null, destino);
        },

        filename(req, file, cb) {
            const extensao = allowlist[file.mimetype];

            if (!extensao) {
                return cb(ApiError.badRequest(mensagem));
            }

            return cb(null, `${Date.now()}-${crypto.randomUUID()}${extensao}`);
        }
    });

    return multer({
        storage,

        limits: {
            fileSize: env.security.maxUploadBytes,
            files
        },

        fileFilter(req, file, cb) {
            if (!allowlist[file.mimetype]) {
                return cb(ApiError.badRequest(mensagem));
            }

            return cb(null, true);
        }
    });
};

/** Imagens de perfil, capa e postagens. */
export const uploadImagem = criarUpload(MIME_IMAGENS, {
    files: 1,
    mensagem: "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP."
});

/** Currículos e certificados (PDF/DOC/DOCX). */
export const uploadDocumento = criarUpload(MIME_DOCUMENTOS, {
    files: 1,
    mensagem: "Formato inválido. Envie um arquivo PDF, DOC ou DOCX."
});

/** Anexos de postagem: até 4 arquivos, imagens ou documentos. */
export const uploadAnexos = criarUpload(
    { ...MIME_IMAGENS, ...MIME_DOCUMENTOS },
    {
        files: 4,
        mensagem:
            "Formato inválido. Envie imagens (PNG, JPEG, WEBP) ou documentos (PDF, DOC, DOCX)."
    }
);

/** URL pública servida por `/uploads` no app.js. */
export const urlPublica = (arquivo) => {
    if (!arquivo) {
        return null;
    }

    return `/uploads/${arquivo.filename}`;
};

export const tipoDoArquivo = (arquivo) => {
    return MIME_IMAGENS[arquivo.mimetype] ? "imagem" : "documento";
};

export default uploadImagem;
