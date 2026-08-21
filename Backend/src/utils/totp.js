import crypto from "node:crypto";

/**
 * TOTP (RFC 6238) implementado só com `node:crypto` — sem dependência nova.
 * Compatível com qualquer app autenticador padrão (Google Authenticator,
 * Authy, Microsoft Authenticator, etc.): HMAC-SHA1, 6 dígitos, passo de 30s.
 */

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PASSO_SEGUNDOS = 30;
const DIGITOS = 6;

const base32Encode = (buffer) => {
    let bits = "";
    let saida = "";

    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, "0");
    }

    for (let i = 0; i + 5 <= bits.length; i += 5) {
        saida += ALFABETO_BASE32[parseInt(bits.slice(i, i + 5), 2)];
    }

    return saida;
};

const base32Decode = (texto) => {
    const limpo = String(texto).toUpperCase().replace(/[^A-Z2-7]/g, "");
    let bits = "";

    for (const char of limpo) {
        const indice = ALFABETO_BASE32.indexOf(char);
        if (indice === -1) continue;
        bits += indice.toString(2).padStart(5, "0");
    }

    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return Buffer.from(bytes);
};

/** Gera um novo segredo TOTP (160 bits), em base32. */
export const gerarSegredoBase32 = () => base32Encode(crypto.randomBytes(20));

/** URI padrão `otpauth://` para o app autenticador (via QR code ou digitação manual). */
export const gerarUriOtpAuth = (segredoBase32, contaLabel, emissor = "ACESSO") => {
    const rotulo = encodeURIComponent(`${emissor}:${contaLabel}`);
    const parametros = new URLSearchParams({
        secret: segredoBase32,
        issuer: emissor,
        algorithm: "SHA1",
        digits: String(DIGITOS),
        period: String(PASSO_SEGUNDOS)
    });

    return `otpauth://totp/${rotulo}?${parametros.toString()}`;
};

const hotp = (segredoBase32, contador) => {
    const chave = base32Decode(segredoBase32);

    const bufferContador = Buffer.alloc(8);
    bufferContador.writeBigUInt64BE(BigInt(contador));

    const hmac = crypto.createHmac("sha1", chave).update(bufferContador).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binario =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    return String(binario % 10 ** DIGITOS).padStart(DIGITOS, "0");
};

/** Código válido no instante atual (útil só para exibir/depurar, não para verificar login). */
export const totpAtual = (segredoBase32, agora = Date.now()) => {
    const contador = Math.floor(agora / 1000 / PASSO_SEGUNDOS);
    return hotp(segredoBase32, contador);
};

/**
 * Verifica um código informado pelo usuário, tolerando ±1 passo (30s) de
 * deriva de relógio — janela padrão de apps autenticadores.
 */
export const verificarCodigoTotp = (segredoBase32, codigo, janela = 1) => {
    const codigoLimpo = String(codigo || "").trim();

    if (!/^\d{6}$/.test(codigoLimpo)) {
        return false;
    }

    const contadorAtual = Math.floor(Date.now() / 1000 / PASSO_SEGUNDOS);

    for (let deslocamento = -janela; deslocamento <= janela; deslocamento++) {
        const esperado = hotp(segredoBase32, contadorAtual + deslocamento);

        const bufferEsperado = Buffer.from(esperado);
        const bufferInformado = Buffer.from(codigoLimpo);

        if (
            bufferEsperado.length === bufferInformado.length &&
            crypto.timingSafeEqual(bufferEsperado, bufferInformado)
        ) {
            return true;
        }
    }

    return false;
};
