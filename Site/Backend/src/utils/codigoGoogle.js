import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import env from "../config/env.js";
import ErroApi from "./ErroApi.js";

/**
 * Os dois "papéis" que o servidor assina depois de verificar o ID token do Google.
 *
 * - **Código de entrega**: vai ao Site na volta do Google, dura pouco e serve **uma vez só**, e só no
 *   navegador que começou o fluxo (leva o hash de um segredo que ficou no `sessionStorage` dele).
 *   Troca-se por sessão, por conflito ou pelo cadastro.
 * - **Prova do Google**: sai do `concluir` quando a pessoa ainda não tem conta e acompanha o
 *   cadastro até o fim. É o que garante, no servidor, qual conta Google foi verificada. Vive só na
 *   memória do navegador (`sessionStorage`), nunca na URL.
 *
 * Cada um tem a sua `audience`, então um nunca é aceito no lugar do outro, e nenhum dos dois é
 * aceito como access token (que exige `issuer: acesso-api`).
 */
export const SEGUNDOS_CODIGO_DE_ENTREGA = 120;
export const SEGUNDOS_PROVA = 15 * 60;

const AUDIENCIA_ENTREGA = "acesso:google:entrega";
const AUDIENCIA_PROVA = "acesso:google:prova";

/** O hash SHA-256, em base64url sem preenchimento, de um segredo de 256 bits: sempre 43 caracteres. */
const FORMATO_DO_VINCULO = /^[A-Za-z0-9_-]{43}$/;

export const vinculoValido = (hash) => typeof hash === "string" && FORMATO_DO_VINCULO.test(hash);

/** O mesmo hash que o Site calcula (`lib/googleNavegador.ts`) a partir do segredo que guardou. */
export const hashDoVinculo = (segredo) =>
    crypto.createHash("sha256").update(String(segredo)).digest("base64url");

/**
 * Confere que quem apresenta o código é o navegador que começou o fluxo: o hash do segredo que ele
 * mandou tem de ser o hash que foi gravado no código. Comparação em tempo constante.
 */
export function conferirVinculo(hashNoCodigo, segredoApresentado) {
    const esperado = Buffer.from(String(hashNoCodigo ?? ""));
    const apresentado = Buffer.from(
        typeof segredoApresentado === "string" && segredoApresentado ? hashDoVinculo(segredoApresentado) : ""
    );

    if (esperado.length === 0 || esperado.length !== apresentado.length || !crypto.timingSafeEqual(esperado, apresentado)) {
        throw ErroApi.requisicaoInvalida(
            "Esta entrada com o Google não começou neste navegador. Volte ao login e use o botão do Google de novo."
        );
    }
}

export function assinarCodigoDeEntrega({ perfil, tipoConta, vinculo }) {
    return jwt.sign({ perfil, tipoConta, vinculo }, env.jwt.secret, {
        expiresIn: SEGUNDOS_CODIGO_DE_ENTREGA,
        audience: AUDIENCIA_ENTREGA,
        jwtid: crypto.randomUUID()
    });
}

/** Lê o código de entrega e devolve o conteúdo (`perfil`, `tipoConta`, `vinculo`, `jti`, `exp`). */
export function lerCodigoDeEntrega(codigo) {
    try {
        const conteudo = jwt.verify(codigo, env.jwt.secret, { audience: AUDIENCIA_ENTREGA });

        if (!conteudo?.perfil?.sub || !vinculoValido(conteudo.vinculo) || !conteudo.jti) {
            throw new Error("código sem perfil, vínculo ou identificador");
        }

        return conteudo;
    } catch {
        // `ErroApi` para o middleware de erro devolver 400 com a mensagem; um `Error` comum virava
        // 500 "Erro interno do servidor", que não diz à pessoa o que fazer.
        throw ErroApi.requisicaoInvalida("Sessão do Google expirada. Tente entrar novamente.");
    }
}

export function assinarProva(perfil) {
    return jwt.sign({ perfil }, env.jwt.secret, {
        expiresIn: SEGUNDOS_PROVA,
        audience: AUDIENCIA_PROVA,
        jwtid: crypto.randomUUID()
    });
}

/**
 * Lê a prova do Google que acompanha o cadastro. Quando falta ou é inválida, o erro diz o que fazer
 * (entrar com o Google de novo), porque ali houve intenção de vincular e ela não pôde ser comprovada.
 */
export function lerProva(prova) {
    let conteudo;
    try {
        conteudo = jwt.verify(prova, env.jwt.secret, { audience: AUDIENCIA_PROVA });
    } catch {
        throw ErroApi.requisicaoInvalida("A verificação com o Google expirou. Entre com o Google novamente.");
    }

    if (!conteudo?.perfil?.sub) {
        throw ErroApi.requisicaoInvalida("Verificação do Google inválida.");
    }

    return conteudo;
}
