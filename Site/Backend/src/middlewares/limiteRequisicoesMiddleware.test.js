import { describe, it, expect, afterEach } from "vitest";
import express from "express";

import { LIMITE_GOOGLE_POR_JANELA, criarLimiteGoogle } from "./limiteRequisicoesMiddleware.js";

/**
 * O limite das rotas do Google (achado 16 da auditoria): conta **todas** as requisições, e não só as
 * falhas, e o `callback` responde com um redirecionamento, não com JSON. Aqui o Express e o
 * `express-rate-limit` são de verdade, numa porta local.
 */

let servidor;

/** Sobe um app com a rota `/x` atrás do limite e devolve uma função que a chama. */
async function subir(limite) {
    const app = express();
    app.get("/x", limite, (req, res) => res.status(200).json({ ok: true }));
    await new Promise((resolve) => {
        servidor = app.listen(0, "127.0.0.1", resolve);
    });
    const { port } = servidor.address();

    return () => fetch(`http://127.0.0.1:${port}/x`, { redirect: "manual" });
}

afterEach(async () => {
    await new Promise((resolve) => (servidor ? servidor.close(resolve) : resolve()));
    servidor = null;
});

describe("criarLimiteGoogle", () => {
    it("deixa passar até o limite, mesmo quando todas as respostas são 200", async () => {
        const chamar = await subir(criarLimiteGoogle({ max: 3 }));

        const status = [];
        for (let i = 0; i < 3; i += 1) status.push((await chamar()).status);

        expect(status).toEqual([200, 200, 200]);
    });

    it("recusa com 429 a requisição seguinte, que o limite de falhas nunca pegaria (resposta 200)", async () => {
        const chamar = await subir(criarLimiteGoogle({ max: 3 }));
        for (let i = 0; i < 3; i += 1) await chamar();

        const resposta = await chamar();

        expect(resposta.status).toBe(429);
        expect(await resposta.json()).toMatchObject({ sucesso: false, mensagem: expect.stringContaining("Google") });
    });

    it("informa o limite nos cabeçalhos padrão, para o cliente se organizar", async () => {
        const chamar = await subir(criarLimiteGoogle({ max: 3 }));

        const resposta = await chamar();

        expect(resposta.headers.get("ratelimit-limit") ?? resposta.headers.get("ratelimit")).toBeTruthy();
    });

    it("com aoExceder, troca a resposta de limite (o callback redireciona ao Site)", async () => {
        const aoExceder = (req, res) => res.redirect("https://site.exemplo/retorno-google?erro=falha");
        const chamar = await subir(criarLimiteGoogle({ max: 1, aoExceder }));
        await chamar();

        const resposta = await chamar();

        expect(resposta.status).toBe(302);
        expect(resposta.headers.get("location")).toBe("https://site.exemplo/retorno-google?erro=falha");
    });

    it("sem aoExceder, não redireciona: é JSON", async () => {
        const chamar = await subir(criarLimiteGoogle({ max: 1 }));
        await chamar();

        const resposta = await chamar();

        expect(resposta.headers.get("content-type")).toMatch(/json/);
    });

    it("o padrão deixa folga para uma escola ou um escritório atrás do mesmo IP", () => {
        expect(LIMITE_GOOGLE_POR_JANELA).toBeGreaterThanOrEqual(30);
    });
});
