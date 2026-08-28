import { criptografar, descriptografar } from "./criptografia.js";
import { hashToken } from "./tokens.js";

/**
 * Hooks Sequelize para migrar um campo sensível (CPF, CNPJ) de texto puro
 * para armazenamento cifrado (AES-256-GCM), de forma transparente para todo
 * código que já lê/escreve `instancia.cpf`/`instancia.cnpj` como texto puro
 * — nenhum service/controller precisa mudar como lê ou grava esse campo.
 *
 * - Ao salvar (create ou update): se o campo puro foi definido/alterado,
 *   cifra o valor e grava também um hash SHA-256 determinístico (usado só
 *   para checar duplicidade — o cifrado tem IV aleatório a cada chamada,
 *   então nunca é comparável entre si), e LIMPA o campo puro antes do
 *   INSERT/UPDATE — nenhuma gravação nova grava texto puro no banco.
 * - Ao ler (findAll/findOne/findByPk) e logo após salvar: decifra de volta
 *   para o campo puro em memória, então qualquer serialização/checagem que
 *   já existia continua recebendo o valor esperado.
 * - Linhas antigas, gravadas antes desta migração (só têm o campo puro,
 *   sem `*_cifrado`), continuam sendo lidas exatamente como antes — só
 *   passam a ser cifradas na próxima vez que esse campo for salvo de novo
 *   (ou via script de backfill, ver scripts/backfillCpfCnpj.mjs).
 *
 * Reusado por Candidato (cpf) e Empresa (cnpj) — mesma lógica, campos
 * diferentes.
 */
export function criarHooksCampoCifrado({ campoPuro, campoCifrado, campoHash }) {
    function decifrarSeNecessario(instancia) {
        if (!instancia || typeof instancia.get !== "function") return;

        const cifrado = instancia.get(campoCifrado);
        if (!cifrado) return; // linha antiga, ainda em texto puro — nada a fazer

        try {
            instancia.setDataValue(campoPuro, descriptografar(cifrado));
        } catch (erro) {
            // Nunca derruba a requisição por um valor cifrado corrompido —
            // só registra o problema e deixa o campo como veio do banco.
            console.error(`[campoCifrado] Falha ao decifrar "${campoPuro}":`, erro.message);
        }
    }

    return {
        beforeSave(instancia) {
            if (!instancia.changed(campoPuro)) return;

            const valor = instancia.get(campoPuro);

            if (!valor) {
                // Campo explicitamente limpo (null/"") — limpa tudo junto.
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
