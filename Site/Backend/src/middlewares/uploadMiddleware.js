import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";
import { storageHabilitado, enviarArquivo, removerArquivo } from "../utils/supabaseStorage.js";

/**
 * Uploads da plataforma.
 *
 * Proteções aplicadas (OWASP A04/A08):
 * - nome de arquivo gerado no servidor (evita path traversal pelo `originalname`);
 * - extensão derivada de uma allowlist, nunca só do nome ou do mimetype declarados pelo cliente, e
 *   a assinatura binária real do arquivo também é conferida (`assinaturaValida`);
 * - limite de tamanho por tipo de arquivo (vídeo tem limite próprio, maior que o de imagem e
 *   documento);
 * - diretório de destino criado fora da árvore de código-fonte.
 *
 * Armazenamento: com o Supabase Storage configurado (`config/env.js`), o multer só recebe o arquivo
 * em memória e `criarProcessadorArmazenamento` o envia para lá. Sem Supabase, os arquivos ficam no
 * disco local, o que basta para desenvolvimento.
 *
 * O banco guarda sempre um caminho relativo estável (por exemplo
 * `postagens/<usuarioId>/<uuid>.mp4`), nunca a URL final: a URL é resolvida sob demanda, com
 * `resolverUrlExibicao` ou `gerarUrlAssinada` (`supabaseStorage.js`).
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

/** Vídeo de postagem: só os dois formatos com suporte de reprodução amplo no navegador. */
export const MIME_VIDEOS = {
    "video/mp4": ".mp4",
    "video/webm": ".webm"
};

const TODAS_EXTENSOES = { ...MIME_IMAGENS, ...MIME_DOCUMENTOS, ...MIME_VIDEOS };

/** Limite de tamanho por mimetype: vídeo nunca reaproveita o limite de imagem/documento. */
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
 * declarado; nunca confia só no `Content-Type` enviado pelo cliente.
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
            // .docx é um ZIP (Office Open XML): assinatura padrão de ZIP.
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

/**
 * Lê só os primeiros bytes de um arquivo em disco, o suficiente para conferir a assinatura quando o
 * multer não guardou o arquivo em memória.
 */
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
        // Arquivo já pode não existir (ex.: upload em memória), então ignora.
    }
}

/**
 * Remove do Storage os arquivos já enviados por esta requisição quando um arquivo seguinte do mesmo
 * lote falha (assinatura inválida, tamanho, erro do Storage). Sem isso, num lote de até 4 anexos
 * com falha no terceiro, os dois primeiros ficariam órfãos no bucket, sem linha no banco. Nunca
 * lança: uma falha na limpeza não pode esconder o erro original que o cliente precisa ver.
 */
async function limparEnviadosNestaOperacao(caminhos, privado) {
    if (caminhos.length === 0) return;

    const resultados = await Promise.allSettled(
        caminhos.map((caminho) => removerArquivo(caminho, { privado }))
    );

    const falhas = resultados.filter(
        (r) => r.status === "rejected" || r.value === false
    ).length;

    if (falhas > 0) {
        console.error(
            JSON.stringify({
                nivel: "error",
                servico: "uploadMiddleware.criarProcessadorArmazenamento",
                etapa: "limpeza_apos_falha_parcial_do_lote",
                totalArquivos: caminhos.length,
                falhas
            })
        );
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
                      return cb(ErroApi.requisicaoInvalida(mensagem));
                  }

                  return cb(null, `${Date.now()}-${crypto.randomUUID()}${extensao}`);
              }
          });

    return multer({
        storage,

        limits: {
            // Teto do multer por arquivo. Com tipos de limites diferentes no mesmo upload (imagem e
            // vídeo em `uploadAnexos`), usa o maior; o limite fino por mimetype, que gera a
            // mensagem para o usuário, é aplicado em `criarProcessadorArmazenamento`. O `+ 1`
            // compensa o busboy (usado pelo multer), que trata `fileSize` como limite exclusivo:
            // sem ele, um vídeo de exatamente 50 MiB (`MAX_VIDEO_UPLOAD_BYTES`) seria recusado
            // aqui.
            fileSize: (limiteMaximo ?? env.security.maxUploadBytes) + 1,
            files
        },

        fileFilter(req, file, cb) {
            if (!allowlist[file.mimetype]) {
                return cb(ErroApi.requisicaoInvalida(mensagem));
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
 * Anexos de postagem: até 4 arquivos, imagem ou vídeo. Documento só é aceito em currículo e
 * certificado, via `uploadDocumento`.
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
 * Middleware (fábrica) para usar logo depois de qualquer `upload*.single()` ou `.array()`. Sempre
 * valida a assinatura binária real do arquivo e o limite de tamanho do seu mimetype, mesmo sem
 * Supabase configurado (a proteção vale também no disco local). Com o Supabase Storage configurado,
 * também envia o arquivo para lá e coloca o caminho (não a URL) em `.url`.
 *
 * `pasta`: string ou função `(req) => string` com o prefixo de pasta dentro do bucket (por exemplo
 * `postagens/<usuarioId>` ou `perfis/<usuarioId>`). Só é usada com o Supabase configurado; no disco
 * local tudo fica num diretório único, sem subpastas.
 *
 * `privado`: quando true, o arquivo vai para o bucket privado (currículos, documentos e anexos de
 * postagem) em vez do público. Nunca é decidido pelo cliente: fica fixo na rota que monta este
 * middleware.
 */
export function criarProcessadorArmazenamento({ pasta, privado = false } = {}) {
    return async function processarArmazenamento(req, res, next) {
        // Caminhos efetivamente enviados ao Storage por esta requisição
        // (ver `limparEnviadosNestaOperacao` acima).
        const enviadosNestaOperacao = [];

        try {
            const prefixo = typeof pasta === "function" ? pasta(req) : pasta;

            const processarUm = async (arquivo) => {
                const buffer = arquivo.buffer ?? (await lerInicioDoArquivo(arquivo.path));

                if (!assinaturaValida(buffer, arquivo.mimetype)) {
                    await apagarSeExistir(arquivo.path);
                    throw ErroApi.requisicaoInvalida(
                        "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado."
                    );
                }

                const limite = LIMITE_BYTES_POR_MIME[arquivo.mimetype] ?? env.security.maxUploadBytes;

                if (arquivo.size > limite) {
                    await apagarSeExistir(arquivo.path);
                    throw ErroApi.requisicaoInvalida(
                        `Arquivo muito grande. Limite de ${Math.round(limite / (1024 * 1024))}MB para este tipo.`
                    );
                }

                if (storageHabilitado) {
                    const extensao = TODAS_EXTENSOES[arquivo.mimetype];
                    const nomeArquivo = `${crypto.randomUUID()}${extensao}`;
                    const caminho = prefixo ? `${prefixo}/${nomeArquivo}` : nomeArquivo;

                    arquivo.filename = nomeArquivo;

                    try {
                        arquivo.url = await enviarArquivo(arquivo.buffer, caminho, arquivo.mimetype, {
                            privado
                        });
                        enviadosNestaOperacao.push(arquivo.url);
                    } catch (erroStorage) {
                        // Um erro cru do Storage (como o bucket recusar o tipo do arquivo) viraria
                        // o 500 genérico do `erroMiddleware`. Aqui ele vira uma mensagem
                        // específica, como no `EmailService.enviar`, e a causa original fica só no
                        // log (`causaOriginal`).
                        const erroTratado = ErroApi.servicoIndisponivel(
                            "Não foi possível enviar o arquivo agora. Tente novamente em alguns instantes."
                        );
                        erroTratado.causaOriginal = erroStorage;
                        throw erroTratado;
                    }
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
            // Um arquivo no meio do lote falhou depois que os anteriores já
            // tinham sido enviados por esta mesma requisição: remove só
            // esses (nunca arquivos de outra requisição/usuário/postagem).
            // O erro de limpeza nunca substitui `erro`, que é o que o
            // cliente precisa ver.
            await limparEnviadosNestaOperacao(enviadosNestaOperacao, privado);
            return next(erro);
        }
    };
}

// Não existe processador genérico, público ou privado: todo envio fica escopado a uma pasta da
// entidade dona (perfil, empresa, currículo ou publicação), definida na rota.

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
