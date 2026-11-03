import crypto from "node:crypto";

import env from "../config/env.js";
import { cifrar, decifrar } from "./cifra.js";

/**
 * Tudo o que a verificação em duas etapas guarda ou entrega em segredo.
 *
 * - **Segredo do TOTP**: cifrado (AES-256-GCM, `cifra.js`) com a conta no contexto, então o valor de
 *   uma linha não abre em outra conta nem em outro uso.
 * - **Configuração em andamento**: o segredo recém-gerado, ainda não confirmado, viaja de volta ao
 *   cliente selado (cifrado e com prazo), em vez de ficar gravado. Abandonar a tela não deixa nada no
 *   banco, e o cliente não consegue trocar o segredo por um que ele escolheu.
 * - **Códigos de recuperação**: só o HMAC-SHA256 é guardado, com uma chave que não está no banco. Um
 *   vazamento do banco sozinho não deixa testar códigos às cegas offline.
 *
 * A chave vem de `MFA_CHAVE_CIFRA` (recomendada em produção, separada do `JWT_SECRET`); sem ela, usa o
 * `JWT_SECRET`, que já é obrigatório. Trocar a chave invalida os segredos já guardados: quem os tinha
 * precisa reconfigurar (o script de emergência cobre o administrador).
 */

const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I, O, 0, 1: não se confundem ao ler
const TAMANHO_DO_CODIGO = 10;
export const QUANTIDADE_CODIGOS_RECUPERACAO = 10;
const MINUTOS_DA_CONFIGURACAO = 10;

function material() {
    return env.mfa?.chaveCifra || env.jwt.secret;
}

export function cifrarSegredoTotp(segredo, usuarioId) {
    return cifrar(segredo, `totp:segredo:${usuarioId}`, material());
}

export function decifrarSegredoTotp(valor, usuarioId) {
    return decifrar(valor, `totp:segredo:${usuarioId}`, material());
}

/** Sela o segredo ainda não confirmado, com prazo. `troca` marca a substituição de um TOTP que já existe. */
export function selarConfiguracao(segredo, usuarioId, { troca = false, agora = Date.now() } = {}) {
    const carga = JSON.stringify({ s: segredo, e: agora + MINUTOS_DA_CONFIGURACAO * 60 * 1000, t: troca });

    return cifrar(carga, `totp:configuracao:${usuarioId}`, material());
}

/** Abre a configuração selada: `null` se foi alterada, é de outra conta ou venceu. */
export function abrirConfiguracao(selo, usuarioId, { agora = Date.now() } = {}) {
    try {
        const { s: segredo, e: expiraEm, t: troca } = JSON.parse(decifrar(selo, `totp:configuracao:${usuarioId}`, material()));

        if (!segredo || !Number.isFinite(expiraEm) || expiraEm <= agora) {
            return null;
        }

        return { segredo, troca: Boolean(troca) };
    } catch {
        return null;
    }
}

function chaveDosCodigos() {
    return Buffer.from(crypto.hkdfSync("sha256", material(), "acesso:mfa", "totp:recuperacao", 32));
}

/** O que a pessoa digita é comparado sem espaços, hífen nem diferença de maiúsculas. */
export function normalizarCodigoDeRecuperacao(codigo) {
    return String(codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function pareceCodigoDeRecuperacao(codigo) {
    const normalizado = normalizarCodigoDeRecuperacao(codigo);

    return normalizado.length === TAMANHO_DO_CODIGO && [...normalizado].every((c) => ALFABETO_CODIGO.includes(c));
}

export function hashCodigoDeRecuperacao(codigo) {
    return crypto.createHmac("sha256", chaveDosCodigos()).update(normalizarCodigoDeRecuperacao(codigo)).digest("hex");
}

/** `QUANTIDADE_CODIGOS_RECUPERACAO` códigos aleatórios, sem repetição, no formato `ABCDE-FGHJK` (50 bits cada). */
export function gerarCodigosDeRecuperacao(quantidade = QUANTIDADE_CODIGOS_RECUPERACAO) {
    const codigos = new Set();

    while (codigos.size < quantidade) {
        let codigo = "";

        for (let i = 0; i < TAMANHO_DO_CODIGO; i += 1) {
            codigo += ALFABETO_CODIGO[crypto.randomInt(ALFABETO_CODIGO.length)];
        }

        codigos.add(`${codigo.slice(0, 5)}-${codigo.slice(5)}`);
    }

    return [...codigos];
}
