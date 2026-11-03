import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { validarCadastroComGoogle } from "./autenticacaoValidator.js";

/**
 * O corpo de `POST /auth/google/cadastrar`: só a prova e a versão dos termos aceitos. Sem aceite, a
 * requisição nem chega ao serviço.
 */

async function validar(body) {
    const req = { body };
    for (const regra of validarCadastroComGoogle) await regra.run(req);
    return validationResult(req);
}

const campos = (resultado) => resultado.array().map((erro) => erro.path);

describe("validarCadastroComGoogle", () => {
    it("aceita a prova e a versão dos termos", async () => {
        expect((await validar({ prova: "prova.assinada.pelo-servidor", termosVersao: "2026-10-09" })).isEmpty()).toBe(true);
    });

    it.each([[undefined], [""], [123], [null]])("recusa a prova %j", async (prova) => {
        const resultado = await validar({ prova, termosVersao: "2026-10-09" });

        expect(campos(resultado)).toContain("prova");
    });

    it.each([[undefined], [""], ["   "]])("recusa a versão dos termos %j, dizendo que o aceite é condição", async (termosVersao) => {
        const resultado = await validar({ prova: "p", termosVersao });

        expect(campos(resultado)).toContain("termosVersao");
        expect(resultado.array().find((erro) => erro.path === "termosVersao").msg).toMatch(/Termos de Uso/);
    });

    it("recusa uma versão de termos grande demais para a coluna (20)", async () => {
        const resultado = await validar({ prova: "p", termosVersao: "x".repeat(21) });

        expect(campos(resultado)).toContain("termosVersao");
    });

    it("não pede nem aceita e-mail, nome ou senha: o que vale vem da prova", async () => {
        const nomes = validarCadastroComGoogle.flatMap((regra) => regra.builder.build().fields);

        expect(nomes.sort()).toEqual(["prova", "termosVersao"]);
    });
});
