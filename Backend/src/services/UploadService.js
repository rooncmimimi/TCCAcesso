import fs from "node:fs";
import path from "node:path";

import env from "../config/env.js";
import { Arquivo } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import {
    urlPublica,
    tipoDoArquivo
} from "../middlewares/uploadMiddleware.js";

const CATEGORIAS = [
    "foto_perfil",
    "capa_perfil",
    "logo_empresa",
    "capa_empresa",
    "postagem",
    "curriculo",
    "certificado",
    "documento"
];

/**
 * Persistência de uploads.
 *
 * O multer já grava o arquivo com nome gerado no servidor; aqui apenas
 * registramos os metadados (auditoria) e devolvemos a URL pública.
 */
class UploadService {
    validarCategoria(categoria) {
        if (!CATEGORIAS.includes(categoria)) {
            throw ApiError.badRequest("Categoria de arquivo inválida.");
        }

        return categoria;
    }

    async registrar(arquivo, categoria, solicitante) {
        if (!arquivo) {
            throw ApiError.badRequest("Nenhum arquivo foi enviado.");
        }

        this.validarCategoria(categoria);

        const registro = await Arquivo.create({
            usuarioId: solicitante.id,
            categoria,
            tipo: tipoDoArquivo(arquivo),
            url: urlPublica(arquivo),
            nomeOriginal: arquivo.originalname?.slice(0, 255) || null,
            mimeType: arquivo.mimetype,
            tamanhoBytes: arquivo.size
        });

        return {
            id: registro.id,
            url: registro.url,
            tipo: registro.tipo,
            categoria: registro.categoria,
            nomeOriginal: registro.nomeOriginal,
            mimeType: registro.mimeType,
            tamanhoBytes: Number(registro.tamanhoBytes)
        };
    }

    async registrarVarios(arquivos, categoria, solicitante) {
        if (!Array.isArray(arquivos) || arquivos.length === 0) {
            throw ApiError.badRequest("Nenhum arquivo foi enviado.");
        }

        const resultados = [];

        for (const arquivo of arquivos) {
            resultados.push(
                // eslint-disable-next-line no-await-in-loop
                await this.registrar(arquivo, categoria, solicitante)
            );
        }

        return resultados;
    }

    /**
     * Remove fisicamente um arquivo servido em /uploads.
     * Nunca aceita caminho vindo do cliente sem normalizar (path traversal).
     */
    async removerArquivoFisico(url) {
        if (!url || !url.startsWith("/uploads/")) {
            return false;
        }

        const base = path.resolve(process.cwd(), env.security.uploadDir);
        const alvo = path.resolve(base, path.basename(url));

        if (!alvo.startsWith(base)) {
            return false;
        }

        try {
            await fs.promises.unlink(alvo);
            return true;
        } catch {
            return false;
        }
    }
}

export default new UploadService();
