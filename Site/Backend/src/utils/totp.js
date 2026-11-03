import crypto from "node:crypto";

/**
 * TOTP (RFC 6238) só com `node:crypto`, sem dependência nova nem serviço externo. Compatível com os
 * aplicativos autenticadores comuns (Google Authenticator, Microsoft Authenticator, Authy, 1Password):
 * HMAC-SHA1, 6 dígitos, intervalo de 30 s.
 *
 * Nada aqui guarda estado. Quem confere o código (`TotpService`) também impede reutilizá-lo, porque
 * este módulo devolve **qual intervalo** bateu, e não só "sim" ou "não".
 */

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const PASSO_SEGUNDOS = 30;
export const DIGITOS = 6;

export function codificarBase32(buffer) {
    let bits = "";
    let saida = "";

    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, "0");
    }

    for (let i = 0; i + 5 <= bits.length; i += 5) {
        saida += ALFABETO_BASE32[Number.parseInt(bits.slice(i, i + 5), 2)];
    }

    return saida;
}

export function decodificarBase32(texto) {
    const limpo = String(texto).toUpperCase().replace(/[^A-Z2-7]/g, "");
    let bits = "";

    for (const caractere of limpo) {
        bits += ALFABETO_BASE32.indexOf(caractere).toString(2).padStart(5, "0");
    }

    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
    }

    return Buffer.from(bytes);
}

/** Segredo novo de 160 bits, em base32 (o formato que os aplicativos pedem). */
export function gerarSegredoBase32() {
    return codificarBase32(crypto.randomBytes(20));
}

/** O segredo em grupos de quatro, para ler e digitar sem errar (`ABCD EFGH ...`). */
export function agruparSegredo(segredoBase32) {
    return segredoBase32.replace(/(.{4})/g, "$1 ").trim();
}

/** URI `otpauth://` que o QR code carrega e que o aplicativo autenticador abre. */
export function gerarUriOtpAuth(segredoBase32, rotuloDaConta, emissor = "ACESSO") {
    const rotulo = encodeURIComponent(`${emissor}:${rotuloDaConta}`);
    const parametros = new URLSearchParams({
        secret: segredoBase32,
        issuer: emissor,
        algorithm: "SHA1",
        digits: String(DIGITOS),
        period: String(PASSO_SEGUNDOS)
    });

    return `otpauth://totp/${rotulo}?${parametros.toString()}`;
}

/** O intervalo de 30 s que contém o instante dado. */
export function passoDoInstante(agora = Date.now()) {
    return Math.floor(agora / 1000 / PASSO_SEGUNDOS);
}

function hotp(segredoBase32, contador) {
    const chave = decodificarBase32(segredoBase32);
    const bufferContador = Buffer.alloc(8);
    bufferContador.writeBigUInt64BE(BigInt(contador));

    const hmac = crypto.createHmac("sha1", chave).update(bufferContador).digest();
    const deslocamento = hmac[hmac.length - 1] & 0x0f;
    const binario =
        ((hmac[deslocamento] & 0x7f) << 24) |
        ((hmac[deslocamento + 1] & 0xff) << 16) |
        ((hmac[deslocamento + 2] & 0xff) << 8) |
        (hmac[deslocamento + 3] & 0xff);

    return String(binario % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

/** O código que um aplicativo mostraria no instante dado (usado nos testes e na conferência). */
export function codigoDoPasso(segredoBase32, passo) {
    return hotp(segredoBase32, passo);
}

/**
 * Procura o intervalo cujo código é o informado, tolerando `janela` intervalos para cada lado (relógio
 * do celular um pouco adiantado ou atrasado). Devolve o intervalo, ou `null` se nenhum bate.
 *
 * Confere todos os intervalos da janela sem parar no primeiro acerto e compara em tempo constante, para
 * o tempo de resposta não revelar quantos dígitos estavam certos.
 */
export function encontrarPassoValido(segredoBase32, codigo, { janela = 1, agora = Date.now() } = {}) {
    const informado = String(codigo ?? "").replace(/\s+/g, "");

    if (!/^\d{6}$/.test(informado)) {
        return null;
    }

    const atual = passoDoInstante(agora);
    let encontrado = null;

    for (let deslocamento = -janela; deslocamento <= janela; deslocamento += 1) {
        const passo = atual + deslocamento;
        const esperado = Buffer.from(hotp(segredoBase32, passo));

        if (crypto.timingSafeEqual(esperado, Buffer.from(informado))) {
            encontrado = passo;
        }
    }

    return encontrado;
}
