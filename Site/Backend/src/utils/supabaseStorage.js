import { createClient } from "@supabase/supabase-js";
import env from "../config/env.js";

/**
 * Com a URL e a chave de service role do Supabase configuradas, os uploads vão para o Storage; sem
 * elas, ficam no disco local (`uploadMiddleware.js`).
 */
export const storageHabilitado = Boolean(
    env.storage.supabaseUrl && env.storage.supabaseServiceRoleKey
);

const client = storageHabilitado
    ? createClient(env.storage.supabaseUrl, env.storage.supabaseServiceRoleKey)
    : null;

const bucketPara = (privado) =>
    privado ? env.storage.privateBucket : env.storage.publicBucket;

/**
 * Envia um buffer para o Supabase Storage num caminho definido pelo backend (nunca pelo nome
 * enviado pelo cliente) e devolve esse mesmo caminho, não a URL final. O banco guarda o caminho,
 * que é a referência estável; a URL de exibição é resolvida sob demanda e nunca persistida.
 * `privado`: true usa o bucket privado (currículos, documentos e anexos de postagem); false, o
 * público (fotos, capas e logos).
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
 * Resolve um valor do banco para uma URL utilizável pelo frontend, só para arquivos do bucket
 * público (fotoPerfil, capaPerfil, logo, capa e anexos antigos de postagem com `privado = false`).
 * Para currículo, certificado e anexos privados, use `gerarUrlAssinada`.
 *
 * Trata três formatos, para não quebrar dados existentes:
 * - URL completa (http/https), de dados antigos: devolve como está;
 * - caminho local (`/uploads/...`), de dados antigos ou do fallback local: devolve como está;
 * - caminho relativo (`postagens/<id>/<uuid>.mp4`): resolve para a URL pública do bucket público.
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
 * Gera uma URL temporária (assinada) para um arquivo do bucket privado. Só deve ser chamada depois
 * da autorização (como em `CandidatoService.gerarUrlCurriculo` e `PostagemService`), e a URL nunca
 * deve ser persistida no banco nem guardada em cache além da própria resposta.
 *
 * Valores antigos (`/uploads/...` local ou URL completa já resolvida) não são objetos do bucket
 * privado e não há o que assinar: nesses casos devolve o valor como está, com `legado: true` e sem
 * expiração real, em vez de fingir que gerou uma assinatura.
 */
export async function gerarUrlAssinada(caminho, { expiresIn, download } = {}) {
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
        .createSignedUrl(caminho, validade, download ? { download } : undefined);

    if (error) {
        throw new Error(`Falha ao gerar URL assinada: ${error.message}`);
    }

    return {
        url: data.signedUrl,
        expiraEm: new Date(Date.now() + validade * 1000).toISOString(),
        legado: false
    };
}

/**
 * Versão em lote de `gerarUrlAssinada`: uma única chamada ao Supabase para vários caminhos (como
 * todos os anexos de uma página do feed), em vez de uma chamada por arquivo. Devolve um array na
 * mesma ordem e tamanho de `caminhos`, com `null` nas entradas vazias ou que falharam; só lança se
 * a chamada em lote inteira falhar. `download` (nome sugerido ou `true`) força
 * `Content-Disposition: attachment` em vez de exibição inline.
 */
export async function gerarUrlsAssinadas(caminhos, { expiresIn, download } = {}) {
    const validade = expiresIn || env.storage.signedUrlExpiresSeconds;
    const resultado = new Array(caminhos.length).fill(null);

    const indices = [];
    caminhos.forEach((caminho, i) => {
        if (!caminho) return;

        if (/^https?:\/\//i.test(caminho) || caminho.startsWith("/uploads/")) {
            resultado[i] = { url: caminho, expiraEm: null, legado: true };
            return;
        }

        if (!storageHabilitado) {
            resultado[i] = { url: `/uploads/${caminho}`, expiraEm: null, legado: true };
            return;
        }

        indices.push(i);
    });

    if (indices.length === 0) {
        return resultado;
    }

    const { data, error } = await client.storage
        .from(env.storage.privateBucket)
        .createSignedUrls(
            indices.map((i) => caminhos[i]),
            validade,
            download ? { download } : undefined
        );

    if (error) {
        throw new Error(`Falha ao gerar URLs assinadas em lote: ${error.message}`);
    }

    indices.forEach((i, posicao) => {
        const item = data[posicao];

        resultado[i] = item?.signedUrl
            ? {
                  url: item.signedUrl,
                  expiraEm: new Date(Date.now() + validade * 1000).toISOString(),
                  legado: false
              }
            : null;
    });

    return resultado;
}
