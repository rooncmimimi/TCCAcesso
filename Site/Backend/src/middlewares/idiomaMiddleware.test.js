import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import { body } from "express-validator";

import idiomaMiddleware, { contextoDeIdioma } from "./idiomaMiddleware.js";
import erroMiddleware from "./erroMiddleware.js";
import validacaoMiddleware from "./validacaoMiddleware.js";
import ErroApi from "../utils/ErroApi.js";
import { adotarIdiomaDaConta, idiomaAtual } from "../i18n/idioma.js";
import { traduzir } from "../i18n/traduzir.js";

/**
 * O idioma da requisição de ponta a ponta, num app Express mínimo com os mesmos middlewares do
 * `app.js` (idioma, parser, contexto, rotas, validação e tratador de erros), chamado por HTTP de
 * verdade.
 */
let servidor;
let base;

beforeAll(async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const app = express();

    app.use(idiomaMiddleware);
    app.use(express.json());
    app.use(contextoDeIdioma);

    app.get("/ok", (req, res) =>
        res.status(200).json({ sucesso: true, mensagem: "Notificação removida.", dados: { mensagem: "Notificação removida." } })
    );

    app.get("/erro-negocio", (req, res, next) => next(ErroApi.naoEncontrado("Usuário não encontrado.")));

    app.get("/erro-com-parte-variavel", (req, res, next) =>
        next(ErroApi.requisicaoInvalida("Para concluir o cadastro, preencha: cidade, estado."))
    );

    app.get("/erro-interno", (req, res, next) => next(new Error("falha qualquer do banco")));

    app.get("/erro-sem-traducao", (req, res, next) => next(ErroApi.conflito("Mensagem que ninguém cadastrou.")));

    app.post(
        "/validar",
        body("email").isEmail().withMessage("Informe um endereço de e-mail válido."),
        body("senha").isLength({ min: 8 }).withMessage("A senha deve ter entre 8 e 72 caracteres."),
        validacaoMiddleware,
        (req, res) => res.status(200).json({ sucesso: true })
    );

    // O que a autenticação faz: sem Accept-Language, adota o idioma salvo na conta.
    app.get("/com-conta", (req, res) => {
        adotarIdiomaDaConta(req, { idioma: "es" });
        res.status(200).json({ idioma: req.idioma, noContexto: idiomaAtual(), texto: traduzir("Erro de validação.") });
    });

    app.use(erroMiddleware);

    await new Promise((resolve) => {
        servidor = app.listen(0, "127.0.0.1", resolve);
    });

    base = `http://127.0.0.1:${servidor.address().port}`;
});

afterAll(async () => {
    await new Promise((resolve) => servidor.close(resolve));
    vi.restoreAllMocks();
});

const pedir = async (caminho, { idioma, ...opcoes } = {}) => {
    const resposta = await fetch(`${base}${caminho}`, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(idioma ? { "Accept-Language": idioma } : {}),
            ...opcoes.headers
        }
    });

    return { status: resposta.status, cabecalhos: resposta.headers, corpo: await resposta.json() };
};

describe("idioma da requisição", () => {
    it("sem Accept-Language responde em português", async () => {
        const { status, corpo, cabecalhos } = await pedir("/erro-negocio");

        expect(status).toBe(404);
        expect(corpo.mensagem).toBe("Usuário não encontrado.");
        expect(cabecalhos.get("content-language")).toBe("pt");
    });

    it.each([
        ["en", "User not found."],
        ["en-US,en;q=0.9", "User not found."],
        ["es", "Usuario no encontrado."],
        ["es-MX", "Usuario no encontrado."],
        ["pt-BR", "Usuário não encontrado."],
        ["fr-FR", "Usuário não encontrado."]
    ])("erro de negócio com Accept-Language %s", async (idioma, esperado) => {
        const { corpo } = await pedir("/erro-negocio", { idioma });

        expect(corpo.mensagem).toBe(esperado);
        expect(corpo.sucesso).toBe(false);
    });

    it("anuncia o idioma usado na resposta e que ela varia com ele", async () => {
        const { cabecalhos } = await pedir("/erro-negocio", { idioma: "es" });

        expect(cabecalhos.get("content-language")).toBe("es");
        expect(cabecalhos.get("vary")).toMatch(/Accept-Language/i);
    });

    it("traduz mensagem de sucesso, mas só a do nível de cima do corpo", async () => {
        const { corpo } = await pedir("/ok", { idioma: "en" });

        expect(corpo.mensagem).toBe("Notification removed.");
        expect(corpo.dados.mensagem).toBe("Notificação removida.");
    });

    it("traduz erro com parte variável", async () => {
        const { corpo } = await pedir("/erro-com-parte-variavel", { idioma: "es" });

        expect(corpo.mensagem).toBe("Para completar el registro, rellena: ciudad, estado.");
    });

    it("erro interno sai genérico e traduzido, sem vazar a causa", async () => {
        const { status, corpo } = await pedir("/erro-interno", { idioma: "en" });

        expect(status).toBe(500);
        expect(corpo.mensagem).toBe("Internal server error.");
        expect(corpo.mensagem).not.toMatch(/banco|database/i);
    });

    it("mensagem sem tradução sai em português, não quebra", async () => {
        const { corpo } = await pedir("/erro-sem-traducao", { idioma: "en" });

        expect(corpo.mensagem).toBe("Mensagem que ninguém cadastrou.");
    });
});

describe("validação", () => {
    it("traduz o título e cada erro de campo", async () => {
        const { status, corpo } = await pedir("/validar", {
            idioma: "en",
            method: "POST",
            body: JSON.stringify({ email: "x", senha: "1" })
        });

        expect(status).toBe(422);
        expect(corpo.mensagem).toBe("Validation error.");
        expect(corpo.erros).toEqual([
            { campo: "email", mensagem: "Enter a valid email address." },
            { campo: "senha", mensagem: "The password must be between 8 and 72 characters." }
        ]);
    });

    it("em espanhol e em português", async () => {
        const dados = { method: "POST", body: JSON.stringify({ email: "x", senha: "12345678" }) };

        const es = await pedir("/validar", { idioma: "es", ...dados });
        const pt = await pedir("/validar", dados);

        expect(es.corpo.erros[0].mensagem).toBe("Introduce una dirección de correo electrónico válida.");
        expect(pt.corpo.erros[0].mensagem).toBe("Informe um endereço de e-mail válido.");
    });
});

describe("idioma da conta", () => {
    it("sem Accept-Language, a requisição adota o idioma salvo na conta", async () => {
        const { corpo } = await pedir("/com-conta");

        expect(corpo).toEqual({ idioma: "es", noContexto: "es", texto: "Error de validación." });
    });

    it("com Accept-Language, vale o que o cliente mandou, não o da conta", async () => {
        const { corpo } = await pedir("/com-conta", { idioma: "en" });

        expect(corpo).toEqual({ idioma: "en", noContexto: "en", texto: "Validation error." });
    });
});
