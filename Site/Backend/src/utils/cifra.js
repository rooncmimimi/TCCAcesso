import crypto from "node:crypto";

import env from "../config/env.js";

/**
 * Cifra simétrica (AES-256-GCM) para guardar um segredo dentro de um valor que passa pelo navegador.
 *
 * Existe para o verificador do PKCE: ele precisa viajar de ida e volta junto com o `state`, que é
 * assinado, mas **legível** (um JWT é só base64), e o endereço de retorno passa pelo histórico e pelos
 * logs do navegador. Um verificador legível ali não protegeria nada; cifrado, só este servidor o abre.
 *
 * A chave é derivada do `JWT_SECRET` (HKDF) para cada `contexto`, então um valor cifrado para um uso
 * não abre em outro, e o segredo do JWT nunca é usado diretamente como chave de cifra. O formato é
 * `base64url(iv ‖ tag ‖ cifrado)`, com IV novo a cada chamada. A autenticação do GCM faz qualquer
 * alteração do valor ser recusada.
 */

const TAMANHO_DO_IV = 12;
const TAMANHO_DA_TAG = 16;

function chaveDoContexto(contexto) {
    return Buffer.from(crypto.hkdfSync("sha256", env.jwt.secret, "acesso:cifra", contexto, 32));
}

export function cifrar(texto, contexto) {
    const iv = crypto.randomBytes(TAMANHO_DO_IV);
    const cifra = crypto.createCipheriv("aes-256-gcm", chaveDoContexto(contexto), iv);
    const cifrado = Buffer.concat([cifra.update(String(texto), "utf8"), cifra.final()]);

    return Buffer.concat([iv, cifra.getAuthTag(), cifrado]).toString("base64url");
}

/** Devolve o texto original, ou lança se o valor foi alterado, vem de outro contexto ou é de outra chave. */
export function decifrar(valor, contexto) {
    const bruto = Buffer.from(String(valor ?? ""), "base64url");

    if (bruto.length <= TAMANHO_DO_IV + TAMANHO_DA_TAG) {
        throw new Error("valor cifrado curto demais");
    }

    const decifra = crypto.createDecipheriv(
        "aes-256-gcm",
        chaveDoContexto(contexto),
        bruto.subarray(0, TAMANHO_DO_IV)
    );
    decifra.setAuthTag(bruto.subarray(TAMANHO_DO_IV, TAMANHO_DO_IV + TAMANHO_DA_TAG));

    return Buffer.concat([decifra.update(bruto.subarray(TAMANHO_DO_IV + TAMANHO_DA_TAG)), decifra.final()]).toString("utf8");
}
