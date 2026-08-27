import { createClient } from "@supabase/supabase-js";
import env from "../config/env.js";

export const storageHabilitado = Boolean(
    env.storage.supabaseUrl && env.storage.supabaseServiceRoleKey
);

const client = storageHabilitado
    ? createClient(env.storage.supabaseUrl, env.storage.supabaseServiceRoleKey)
    : null;

const bucketPara = (privado) =>
    privado ? env.storage.privateBucket : env.storage.publicBucket;

/**
 * Envia um buffer para o Supabase Storage num caminho já definido pelo
 * backend (nunca pelo nome enviado pelo cliente) e devolve esse MESMO
 * caminho — não a URL final. O banco guarda o caminho (referência
 * estável); a URL de exibição é resolvida sob demanda, nunca persistida.
 *
 * `privado`: true → bucket privado (currículos/certificados), false →
 * bucket público (fotos, capas, logos, anexos de postagem).
 */
export async function enviarArquivo(buffer, caminho, mimetype, { privado = false } = {}) {
    const { error } = await client.storage
        .from(bucketPara(privado))
        .upload(caminho, buffer, { contentType: mimetype, upsert: false });

    if (error) {
        throw new Error(`Falha ao enviar arquivo para o storage: ${error.message}`);
    }

    return caminho;
}

/** Remove um arquivo do bucket a partir do caminho gerado no upload. */
export async function removerArquivo(caminho, { privado = false } = {}) {
    if (!storageHabilitado || !caminho) {
        return false;
    }

    const { error } = await client.storage
        .from(bucketPara(privado))
        .remove([caminho]);

    return !error;
}

/**
 * Resolve um valor guardado no banco para uma URL utilizável pelo
 * frontend — SÓ para campos do bucket PÚBLICO (fotoPerfil, capaPerfil,
 * logo, capa, postagem_anexos.url). Nunca usar para currículo/certificado
 * (bucket privado) — para esses, ver `gerarUrlAssinada`.
 *
 * Trata três formatos, para nunca quebrar dado já existente:
 * 1. Já é uma URL completa (http/https) — dado antigo (Supabase ou outro
 *    host) — devolve como está.
 * 2. Já é um caminho local (`/uploads/...`) — dado antigo do disco local
 *    ou o próprio fallback local atual — devolve como está.
 * 3. É um caminho relativo novo (`postagens/<id>/<uuid>.mp4`) — resolve
 *    para a URL pública do bucket público.
 */
export function resolverUrlExibicao(caminho) {
    if (!caminho) {
        return null;
    }

    if (/^https?:\/\//i.test(caminho) || caminho.startsWith("/uploads/")) {
        return caminho;
    }

    if (!storageHabilitado) {
        return `/uploads/${caminho}`;
    }

    const { data } = client.storage
        .from(env.storage.publicBucket)
        .getPublicUrl(caminho);

    return data.publicUrl;
}

/**
 * Gera uma URL temporária (assinada) para um arquivo do bucket PRIVADO —
 * usada exclusivamente por endpoints que já validaram autorização (ver
 * `CandidatoService.gerarUrlCurriculo`). Nunca deve ser persistida no
 * banco nem cacheada além do tempo de resposta da requisição.
 *
 * Compatibilidade com dado antigo: valores salvos antes desta arquitetura
 * (`/uploads/...` local ou uma URL completa já resolvida) não são objetos
 * do bucket privado — não há o que assinar. Nesses casos devolve o valor
 * como está, marcado como `legado: true` e sem expiração real, em vez de
 * fingir que uma assinatura foi gerada.
 */
export async function gerarUrlAssinada(caminho, { expiresIn } = {}) {
    if (!caminho) {
        return null;
    }

    if (/^https?:\/\//i.test(caminho) || caminho.startsWith("/uploads/")) {
        return { url: caminho, expiraEm: null, legado: true };
    }

    if (!storageHabilitado) {
        return { url: `/uploads/${caminho}`, expiraEm: null, legado: true };
    }

    const validade = expiresIn || env.storage.signedUrlExpiresSeconds;

    const { data, error } = await client.storage
        .from(env.storage.privateBucket)
        .createSignedUrl(caminho, validade);

    if (error) {
        throw new Error(`Falha ao gerar URL assinada: ${error.message}`);
    }

    return {
        url: data.signedUrl,
        expiraEm: new Date(Date.now() + validade * 1000).toISOString(),
        legado: false
    };
}
