import crypto from "node:crypto";
import env from "../config/env.js";

/**
 * Criptografia simétrica (AES-256-GCM) para dados que precisam ser
 * recuperados em texto puro pela aplicação — diferente de senha (bcrypt,
 * uma via) ou de tokens/códigos (SHA-256, só comparação).
 *
 * Uso atual: segredo TOTP do 2FA, que precisa ser lido de volta a cada
 * verificação de código — por isso não pode ser um hash.
 *
 * A chave é derivada do `JWT_SECRET` (já validado com 32+ caracteres no
 * boot da aplicação — ver `config/env.js`) via SHA-256, evitando adicionar
 * mais uma variável de ambiente obrigatória só para isso.
 */

const CHAVE = crypto.createHash("sha256").update(env.jwt.secret).digest();

export const criptografar = (textoPuro) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", CHAVE, iv);

    const cifrado = Buffer.concat([
        cipher.update(String(textoPuro), "utf8"),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    // iv + tag + cifrado, tudo em base64 num único campo TEXT.
    return Buffer.concat([iv, tag, cifrado]).toString("base64");
};

export const descriptografar = (valorCifrado) => {
    const bruto = Buffer.from(valorCifrado, "base64");

    const iv = bruto.subarray(0, 12);
    const tag = bruto.subarray(12, 28);
    const cifrado = bruto.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", CHAVE, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString(
        "utf8"
    );
};
