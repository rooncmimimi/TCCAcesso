import bcrypt from "bcrypt";
import env from "../config/env.js";

/**
 * Gera o hash da senha usando bcrypt.
 */
export const gerarHashSenha = async (senha) => {
    return bcrypt.hash(senha, env.security.bcryptRounds);
};

/**
 * Compara a senha informada com o hash armazenado.
 * Nunca faça comparação direta de strings.
 */
export const compararSenha = async (senha, senhaHash) => {
    if (!senha || !senhaHash) {
        return false;
    }

    return bcrypt.compare(senha, senhaHash);
};
