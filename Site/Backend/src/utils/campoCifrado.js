import { criptografar, descriptografar } from "./criptografia.js";
import { hashToken } from "./tokens.js";

/**
 * Hooks do Sequelize que guardam um campo sensível (CPF, CNPJ) cifrado com AES-256-GCM sem que o
 * resto do código perceba: quem lê ou grava `instancia.cpf` ou `instancia.cnpj` como texto puro
 * continua igual.
 *
 * - Ao salvar (create ou update): se o campo puro foi definido ou alterado, cifra o valor, grava
 *   também um hash SHA-256 determinístico e limpa o campo puro antes do INSERT/UPDATE, para nunca
 *   gravar texto puro no banco. O hash serve para checar duplicidade, porque o valor cifrado usa IV
 *   aleatório a cada chamada e não é comparável.
 * - Ao ler (findAll, findOne, findByPk) e logo depois de salvar: decifra de volta para o campo puro
 *   em memória, então serializações e checagens continuam recebendo o valor esperado.
 *
 * `cpf` e `cnpj` são campos virtuais nos models: colunas em texto puro
 * não existem mais no banco. Usado por `Candidato` (cpf) e `Empresa` (cnpj).
 */
export function criarHooksCampoCifrado({ campoPuro, campoCifrado, campoHash }) {
    function decifrarSeNecessario(instancia) {
        if (!instancia || typeof instancia.get !== "function") return;

        const cifrado = instancia.get(campoCifrado);
        if (!cifrado) return; // sem valor cifrado (campo não preenchido): nada a decifrar

        try {
            instancia.setDataValue(campoPuro, descriptografar(cifrado));
        } catch (erro) {
            // Nunca derruba a requisição por um valor cifrado corrompido:
            // só registra o problema e deixa o campo como veio do banco.
            console.error(`[campoCifrado] Falha ao decifrar "${campoPuro}":`, erro.message);
        }
    }

    return {
        beforeSave(instancia) {
            if (!instancia.changed(campoPuro)) return;

            const valor = instancia.get(campoPuro);

            if (!valor) {
                // Campo explicitamente limpo (null/""): limpa tudo junto.
                instancia.setDataValue(campoCifrado, null);
                instancia.setDataValue(campoHash, null);
                return;
            }

            instancia.setDataValue(campoCifrado, criptografar(valor));
            instancia.setDataValue(campoHash, hashToken(valor));
            instancia.setDataValue(campoPuro, null);
        },

        afterSave(instancia) {
            decifrarSeNecessario(instancia);
        },

        afterFind(resultado) {
            if (!resultado) return;

            if (Array.isArray(resultado)) {
                resultado.forEach(decifrarSeNecessario);
            } else {
                decifrarSeNecessario(resultado);
            }
        }
    };
}

/** Hash determinístico para checar duplicidade de CPF/CNPJ sem descriptografar todo mundo. */
export function hashCampoCifrado(valorPuro) {
    return hashToken(String(valorPuro));
}
