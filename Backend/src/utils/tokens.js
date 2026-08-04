import crypto from "node:crypto";

/**
 * Tokens opacos (refresh token / código de recuperação).
 *
 * O valor em claro só existe na resposta HTTP; o banco guarda apenas
 * o hash SHA-256 — vazamento da tabela não permite reuso (OWASP A02/A07).
 */

export const gerarTokenOpaco = (bytes = 48) => {
    return crypto.randomBytes(bytes).toString("hex");
};

export const gerarCodigoNumerico = (digitos = 6) => {
    const maximo = 10 ** digitos;
    const valor = crypto.randomInt(0, maximo);

    return String(valor).padStart(digitos, "0");
};

export const hashToken = (valor) => {
    return crypto.createHash("sha256").update(String(valor)).digest("hex");
};

/** Comparação em tempo constante entre dois hashes hexadecimais. */
export const compararHash = (a, b) => {
    const bufferA = Buffer.from(String(a));
    const bufferB = Buffer.from(String(b));

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
};
