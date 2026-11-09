/**
 * Prepara a imagem que vai ao modelo de visão para a sugestão de descrição.
 *
 * Duas coisas, as duas por motivo concreto:
 *
 * 1. **Declara o tipo certo**, lendo os primeiros bytes em vez de confiar no `type` do Blob. Ao
 *    editar a descrição de um anexo já publicado, a imagem vem de um `fetch` da URL assinada, e
 *    esse `fetch` pode devolver `application/octet-stream`. O backend confere a assinatura do
 *    arquivo contra o tipo declarado e recusaria, com uma mensagem que não ajuda ninguém.
 * 2. **Reduz a imagem** antes de enviar. Uma foto de 4 MB vira ~5,5 MB de base64 no pedido ao
 *    modelo, e modelo gratuito desiste ou estoura o tempo. Para dizer o que aparece numa foto,
 *    1024 px no lado maior é mais do que suficiente — e o pedido fica em alguns segundos em vez de
 *    dezenas. De graça, no navegador de quem publica.
 *
 * Nunca lança: sem suporte a canvas (ou se algo falhar no meio), devolve a imagem como ela veio.
 * Perder a redução é melhor do que perder o recurso.
 */

/** Lado maior, em pixels, depois da redução. */
export const LADO_MAXIMO = 1024;

/** Qualidade do JPEG gerado. Acima disso o arquivo cresce sem a descrição melhorar. */
const QUALIDADE_JPEG = 0.85;

/** Abaixo disto não vale reencodar: a imagem já é pequena. */
const TAMANHO_CONFORTAVEL_BYTES = 300 * 1024;

const ASSINATURAS = [
    { tipo: "image/png", extensao: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
    { tipo: "image/jpeg", extensao: "jpg", bytes: [0xff, 0xd8, 0xff] }
] as const;

const EXTENSAO_POR_TIPO: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
};

/** O tipo real, pelos primeiros bytes. `null` quando não é PNG, JPEG nem WEBP. */
async function tipoPelosBytes(imagem: Blob): Promise<string | null> {
    let cabecalho: Uint8Array;

    try {
        cabecalho = new Uint8Array(await imagem.slice(0, 12).arrayBuffer());
    } catch {
        return null;
    }

    for (const { tipo, bytes } of ASSINATURAS) {
        if (bytes.every((byte, indice) => cabecalho[indice] === byte)) {
            return tipo;
        }
    }

    // WEBP: "RIFF" nos bytes 0-3 e "WEBP" nos bytes 8-11.
    const texto = (inicio: number, fim: number) =>
        String.fromCharCode(...cabecalho.slice(inicio, fim));

    if (texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP") {
        return "image/webp";
    }

    return null;
}

/** Desenha a imagem reduzida num canvas e devolve um JPEG. `null` quando não dá. */
async function reduzir(imagem: Blob): Promise<Blob | null> {
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
        return null;
    }

    let bitmap: ImageBitmap;

    try {
        // `from-image`: respeita a orientação do EXIF. Sem isso, foto tirada em pé seria
        // descrita de lado.
        bitmap = await createImageBitmap(imagem, { imageOrientation: "from-image" });
    } catch {
        return null;
    }

    try {
        const ladoMaior = Math.max(bitmap.width, bitmap.height);
        const escala = ladoMaior > LADO_MAXIMO ? LADO_MAXIMO / ladoMaior : 1;

        if (escala === 1 && imagem.size <= TAMANHO_CONFORTAVEL_BYTES) {
            return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * escala));
        canvas.height = Math.max(1, Math.round(bitmap.height * escala));

        const contexto = canvas.getContext("2d");

        if (!contexto) {
            return null;
        }

        // JPEG não tem transparência: sem o fundo branco, uma imagem transparente viraria preta e
        // o modelo descreveria um fundo preto que não existe.
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, canvas.width, canvas.height);
        contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        const reduzida = await new Promise<Blob | null>((resolver) => {
            if (typeof canvas.toBlob !== "function") {
                resolver(null);
                return;
            }

            canvas.toBlob((blob) => resolver(blob), "image/jpeg", QUALIDADE_JPEG);
        });

        // Reencodar nem sempre diminui (imagem já pequena e muito comprimida).
        return reduzida && reduzida.size < imagem.size ? reduzida : null;
    } catch {
        return null;
    } finally {
        bitmap.close?.();
    }
}

/**
 * @param imagem o `File` escolhido no formulário, ou o `Blob` do anexo já publicado.
 * @returns o arquivo a enviar e o nome do campo, com tipo e extensão coerentes.
 */
export async function prepararImagemParaDescricao(
    imagem: File | Blob
): Promise<{ arquivo: Blob; nome: string }> {
    const reduzida = await reduzir(imagem);

    if (reduzida) {
        return { arquivo: reduzida, nome: "imagem.jpg" };
    }

    // Sem redução: pelo menos garante que o tipo declarado é o tipo real.
    const tipoReal = (await tipoPelosBytes(imagem)) ?? imagem.type;
    const extensao = EXTENSAO_POR_TIPO[tipoReal] ?? "png";
    const arquivo = imagem.type === tipoReal ? imagem : new Blob([imagem], { type: tipoReal });

    return { arquivo, nome: `imagem.${extensao}` };
}
