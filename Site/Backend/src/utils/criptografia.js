import crypto from "node:crypto";
import env from "../config/env.js";

/**
 * Criptografia simétrica (AES-256-GCM) para dados que a aplicação precisa ler de volta em texto
 * puro, ao contrário de senha (bcrypt, só ida) e de tokens e códigos (SHA-256, só comparação). Hoje
 * só CPF e CNPJ usam (`campoCifrado.js`): eles precisam ser lidos de volta, por isso não podem ser
 * um hash. A chave é derivada do `JWT_SECRET` com SHA-256 (o segredo já é validado com 32
 * caracteres ou mais na inicialização, em `config/env.js`), para não exigir mais uma variável de
 * ambiente só para isso.
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
