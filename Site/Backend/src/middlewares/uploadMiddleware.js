import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { storageHabilitado, enviarArquivo } from "../utils/supabaseStorage.js";

/**
 * Uploads da plataforma.
 *
 * Proteções aplicadas (OWASP A04/A08):
 * - nome de arquivo gerado no servidor (evita path traversal via originalname);
 * - extensão derivada de uma allowlist, nunca do nome/mimetype declarado
 *   pelo cliente sozinho — a assinatura binária real do arquivo também é
 *   conferida (ver `assinaturaValida`);
 * - limite de tamanho por tipo de arquivo (imagem/documento/vídeo têm
 *   limites diferentes — vídeo não reaproveita o limite de imagem);
 * - diretório de destino criado fora da árvore de código-fonte.
 *
 * Armazenamento: quando o Supabase Storage está configurado (ver
 * `config/env.js`), os arquivos vão para lá (persistente) via
 * `criarProcessadorArmazenamento`, e o multer só recebe o arquivo em
 * memória. Sem Supabase configurado, cai no disco local — comportamento
 * original, suficiente para desenvolvimento.
 *
 * Referência guardada no banco: o valor persistido é sempre um CAMINHO
 * relativo estável (ex.: `postagens/<usuarioId>/<uuid>.mp4`), nunca a URL
 * pública final — a URL é resolvida sob demanda (ver `supabaseStorage.js`
 * → `resolverUrlExibicao`, usado pelos getters dos models).
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

/** Vídeo de postagem — só os dois formatos com suporte de reprodução amplo no navegador. */
export const MIME_VIDEOS = {
    "video/mp4": ".mp4",
    "video/webm": ".webm"
};

const TODAS_EXTENSOES = { ...MIME_IMAGENS, ...MIME_DOCUMENTOS, ...MIME_VIDEOS };

/** Limite de tamanho por mimetype — vídeo NUNCA reaproveita o limite de imagem/documento. */
const LIMITE_BYTES_POR_MIME = {
    "image/png": env.security.maxUploadBytes,
    "image/jpeg": env.security.maxUploadBytes,
    "image/webp": env.security.maxUploadBytes,
    "application/pdf": env.security.maxUploadBytes,
    "application/msword": env.security.maxUploadBytes,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        env.security.maxUploadBytes,
    "video/mp4": env.security.maxVideoUploadBytes,
    "video/webm": env.security.maxVideoUploadBytes
};

const destino = path.resolve(process.cwd(), env.security.uploadDir);

if (!storageHabilitado && !fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
}

/**
 * Confere a assinatura binária (magic bytes) do arquivo contra o mimetype
 * declarado — nunca confia só no `Content-Type` enviado pelo cliente.
 * Um PDF renomeado para `.mp4` com `Content-Type: video/mp4` não passa
 * nesta checagem, mesmo que a extensão/allowlist já tenham "aceitado" o
 * upload.
 */
function assinaturaValida(buffer, mimetype) {
    if (!buffer || buffer.length < 8) {
        return false;
    }

    switch (mimetype) {
        case "image/png":
            return (
                buffer[0] === 0x89 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x4e &&
                buffer[3] === 0x47
            );

        case "image/jpeg":
            return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

        case "image/webp":
            return (
                buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
                buffer.length >= 12 &&
                buffer.subarray(8, 12).toString("ascii") === "WEBP"
            );

        case "application/pdf":
            return buffer.subarray(0, 4).toString("ascii") === "%PDF";

        case "application/msword":
            // Assinatura do OLE Compound File (formato binário legado do .doc).
            return (
                buffer[0] === 0xd0 &&
                buffer[1] === 0xcf &&
                buffer[2] === 0x11 &&
                buffer[3] === 0xe0
            );

        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            // .docx é um ZIP (Office Open XML) — assinatura padrão de ZIP.
            return (
                buffer[0] === 0x50 &&
                buffer[1] === 0x4b &&
                (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
            );

        case "video/mp4":
            // Contêiner ISO Base Media (MP4): "ftyp" a partir do byte 4.
            return (
                buffer.length >= 12 &&
                buffer.subarray(4, 8).toString("ascii") === "ftyp"
            );

        case "video/webm":
            // Cabeçalho EBML (WebM/Matroska).
            return (
                buffer[0] === 0x1a &&
                buffer[1] === 0x45 &&
                buffer[2] === 0xdf &&
                buffer[3] === 0xa3
            );

        default:
            return false;
    }
}

async function lerInicioDoArquivo(caminho, bytes = 32) {
    const handle = await fs.promises.open(caminho, "r");
    try {
        const buffer = Buffer.alloc(bytes);
        const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
        return buffer.subarray(0, bytesRead);
    } finally {
        await handle.close();
    }
}

async function apagarSeExistir(caminho) {
    if (!caminho) return;
    try {
        await fs.promises.unlink(caminho);
    } catch {
        // Arquivo já pode não existir (ex.: upload em memória) — ignora.
    }
}

const criarUpload = (allowlist, { files = 1, mensagem, limiteMaximo } = {}) => {
    const storage = storageHabilitado
        ? multer.memoryStorage()
        : multer.diskStorage({
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
            // Teto absoluto do multer (por arquivo). Quando o allowlist mistura
            // tipos com limites diferentes (ex.: imagem + vídeo em uploadAnexos),
            // usa o maior deles aqui — o limite fino por mimetype é aplicado
            // depois, em `criarProcessadorArmazenamento`.
            fileSize: limiteMaximo ?? env.security.maxUploadBytes,
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

/**
 * Anexos de postagem: até 4 arquivos, imagem OU vídeo.
 * "Documento" não é mais aceito como anexo de publicação nova (continua
 * existindo só para currículo/certificado, via `uploadDocumento`) — ver
 * `MIME_DOCUMENTOS` acima, inalterado para esses outros usos.
 */
export const uploadAnexos = criarUpload(
    { ...MIME_IMAGENS, ...MIME_VIDEOS },
    {
        files: 4,
        mensagem: "Formato inválido. Envie imagens (PNG, JPEG, WEBP) ou vídeos (MP4, WEBM).",
        limiteMaximo: env.security.maxVideoUploadBytes
    }
);

/**
 * Middleware (fábrica) a ser usado logo após qualquer
 * `upload*.single()`/`.array()`. Sempre valida a assinatura binária real
 * do arquivo e o limite de tamanho específico do seu mimetype — mesmo
 * sem Supabase configurado (proteção vale também no disco local). Quando
 * o Supabase Storage está configurado, também envia o arquivo para lá e
 * anexa o CAMINHO (não a URL) em `.url`.
 *
 * `pasta`: string ou função `(req) => string` — prefixo de pasta dentro
 * do bucket (ex.: `postagens/<usuarioId>`, `perfis/<usuarioId>`). Só é
 * usado quando o Supabase está configurado; o fallback local continua
 * um diretório único, sem subpastas.
 *
 * `privado`: quando true, o arquivo vai para o bucket PRIVADO
 * (currículos/certificados) em vez do bucket público — nunca decidido
 * pelo cliente, sempre fixo na rota que monta este middleware.
 */
export function criarProcessadorArmazenamento({ pasta, privado = false } = {}) {
    return async function processarArmazenamento(req, res, next) {
        try {
            const prefixo = typeof pasta === "function" ? pasta(req) : pasta;

            const processarUm = async (arquivo) => {
                const buffer = arquivo.buffer ?? (await lerInicioDoArquivo(arquivo.path));

                if (!assinaturaValida(buffer, arquivo.mimetype)) {
                    await apagarSeExistir(arquivo.path);
                    throw ApiError.badRequest(
                        "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado."
                    );
                }

                const limite = LIMITE_BYTES_POR_MIME[arquivo.mimetype] ?? env.security.maxUploadBytes;

                if (arquivo.size > limite) {
                    await apagarSeExistir(arquivo.path);
                    throw ApiError.badRequest(
                        `Arquivo muito grande. Limite de ${Math.round(limite / (1024 * 1024))}MB para este tipo.`
                    );
                }

                if (storageHabilitado) {
                    const extensao = TODAS_EXTENSOES[arquivo.mimetype];
                    const nomeArquivo = `${crypto.randomUUID()}${extensao}`;
                    const caminho = prefixo ? `${prefixo}/${nomeArquivo}` : nomeArquivo;

                    arquivo.filename = nomeArquivo;
                    arquivo.url = await enviarArquivo(arquivo.buffer, caminho, arquivo.mimetype, {
                        privado
                    });
                }
            };

            if (req.file) {
                await processarUm(req.file);
            }

            if (Array.isArray(req.files) && req.files.length > 0) {
                for (const arquivo of req.files) {
                    // eslint-disable-next-line no-await-in-loop
                    await processarUm(arquivo);
                }
            }

            return next();
        } catch (erro) {
            return next(erro);
        }
    };
}

/** Uso simples, sem organização em subpasta (upload genérico — bucket público). */
export const processarArmazenamento = criarProcessadorArmazenamento({});

/** Uso simples, bucket PRIVADO (upload genérico de documento — ex.: certificado). */
export const processarArmazenamentoPrivado = criarProcessadorArmazenamento({
    privado: true
});

/** Caminho a persistir no banco: Supabase Storage (caminho) quando configurado, senão /uploads local. */
export const urlPublica = (arquivo) => {
    if (!arquivo) {
        return null;
    }

    return arquivo.url ?? `/uploads/${arquivo.filename}`;
};

export const tipoDoArquivo = (arquivo) => {
    if (MIME_IMAGENS[arquivo.mimetype]) return "imagem";
    if (MIME_VIDEOS[arquivo.mimetype]) return "video";
    return "documento";
};

export default uploadImagem;
