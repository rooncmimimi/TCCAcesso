import { describe, it, expect } from "vitest";

import { extrairTextoDocumento } from "./extrairTextoDocumento.js";
import ErroApi from "./ErroApi.js";

/**
 * Extração de texto para a importação do currículo: sem IA, local, e sem inventar nada. Arquivo ruim
 * (corrompido, vazio, formato sem extração) vira um erro de 400 com explicação, e nunca um 500.
 * Os arquivos são montados aqui mesmo, byte a byte; nenhum dado real.
 */

const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function falhaCom(promessa) {
    try {
        await promessa;
    } catch (erro) {
        return erro;
    }

    throw new Error("era esperado um erro");
}

describe("extrairTextoDocumento", () => {
    it("PDF corrompido: erro de requisição com explicação (não um erro interno)", async () => {
        const erro = await falhaCom(extrairTextoDocumento(Buffer.from("%PDF-1.4\n isto não é um PDF de verdade \u0000\u0001"), "application/pdf"));

        expect(erro).toBeInstanceOf(ErroApi);
        expect(erro.statusCode).toBe(400);
        expect(erro.message).toMatch(/corrompido|escaneada|extrair texto/);
    });

    it("DOCX corrompido (cabeçalho ZIP com lixo): erro de requisição com explicação", async () => {
        const erro = await falhaCom(extrairTextoDocumento(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]), MIME_DOCX));

        expect(erro).toBeInstanceOf(ErroApi);
        expect(erro.statusCode).toBe(400);
        expect(erro.message).toMatch(/corrompido|extrair texto/);
    });

    it("DOC antigo: diz que não é suportado e o que fazer, em vez de devolver um resultado vazio", async () => {
        const erro = await falhaCom(extrairTextoDocumento(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]), "application/msword"));

        expect(erro).toBeInstanceOf(ErroApi);
        expect(erro.statusCode).toBe(400);
        expect(erro.message).toMatch(/\.doc/);
        expect(erro.message).toMatch(/\.docx ou PDF/);
    });

    it("tipo desconhecido: recusa com a mesma explicação", async () => {
        const erro = await falhaCom(extrairTextoDocumento(Buffer.from("x"), "image/png"));

        expect(erro).toBeInstanceOf(ErroApi);
        expect(erro.statusCode).toBe(400);
    });
});
