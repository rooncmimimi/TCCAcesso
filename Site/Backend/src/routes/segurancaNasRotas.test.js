import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { validarLoginDispositivo, validarProtegerAgora, validarReenvioDeCodigo, validarSolicitarContaComprometida } from "../validators/segurancaValidator.js";
import { rotuloDoDispositivo, mascararEmail } from "../utils/rotuloDoDispositivo.js";
import { EVENTOS_DE_SEGURANCA, descreverEvento } from "../utils/eventosDeSeguranca.js";

/**
 * As rotas do Bloco 3 e quem as protege, lidas da tabela de rotas de verdade (sem servidor nem banco), mais as regras de entrada.
 */

const { default: autenticacaoMiddleware } = await import("../middlewares/autenticacaoMiddleware.js");
const { default: autenticacaoRoutes } = await import("./autenticacaoRoutes.js");
const { limiteAutenticacao, limiteReenvioConfirmacao, limiteRecuperacaoSenha } = await import("../middlewares/limiteRequisicoesMiddleware.js");

const rota = (metodo, caminho) => {
    const camada = autenticacaoRoutes.stack.find((c) => c.route?.path === caminho && c.route.methods[metodo]);

    return camada?.route.stack.map((c) => c.handle);
};

describe("rotas públicas do Bloco 3", () => {
    it.each([
        ["post", "/login/dispositivo"],
        ["post", "/login/dispositivo/reenviar"],
        ["post", "/conta-comprometida/solicitar"],
        ["post", "/conta-comprometida/confirmar"],
        ["get", "/seguranca/disponivel"]
    ])("%s %s existe e NÃO exige sessão (quem chama ainda não tem uma)", (metodo, caminho) => {
        const handlers = rota(metodo, caminho);

        expect(handlers).toBeDefined();
        expect(handlers).not.toContain(autenticacaoMiddleware);
    });

    it.each([
        ["post", "/login/dispositivo", limiteAutenticacao],
        ["post", "/login/dispositivo/reenviar", limiteReenvioConfirmacao],
        ["post", "/conta-comprometida/solicitar", limiteRecuperacaoSenha],
        ["post", "/conta-comprometida/confirmar", limiteAutenticacao],
        ["post", "/conta-comprometida/proteger-agora", limiteAutenticacao]
    ])("%s %s passa pelo limitador de tentativas certo", (metodo, caminho, limitador) => {
        expect(rota(metodo, caminho)).toContain(limitador);
    });
});

describe("rotas da conta logada", () => {
    it.each([
        ["get", "/dispositivos"],
        ["post", "/dispositivos/revogar-todos"],
        ["delete", "/dispositivos/:id"],
        ["get", "/eventos-de-seguranca"],
        ["post", "/conta-comprometida/proteger-agora"]
    ])("%s %s exige a sessão (middleware padrão)", (metodo, caminho) => {
        expect(rota(metodo, caminho)).toContain(autenticacaoMiddleware);
    });
});

describe("validadores", () => {
    const rodar = async (validadores, corpo) => {
        const req = { body: corpo, headers: {}, query: {}, params: {} };

        await Promise.all(validadores.map((v) => v.run(req)));

        return req;
    };
    const erros = async (validadores, corpo) => validationResult(await rodar(validadores, corpo)).array().map((e) => e.path);

    const DESAFIO = "x".repeat(40);

    it("o código precisa ter exatamente 6 números (espaços no meio são tolerados)", async () => {
        expect(await erros(validarLoginDispositivo, { desafio: DESAFIO, codigo: "123456" })).toEqual([]);
        expect(await erros(validarLoginDispositivo, { desafio: DESAFIO, codigo: "123 456" })).toEqual([]);

        for (const ruim of ["12345", "1234567", "abcdef", "", 123456]) {
            expect(await erros(validarLoginDispositivo, { desafio: DESAFIO, codigo: ruim })).toContain("codigo");
        }
    });

    it("o desafio é obrigatório e tem tamanho limitado", async () => {
        expect(await erros(validarLoginDispositivo, { codigo: "123456" })).toContain("desafio");
        expect(await erros(validarLoginDispositivo, { desafio: "curto", codigo: "123456" })).toContain("desafio");
        expect(await erros(validarLoginDispositivo, { desafio: "x".repeat(2001), codigo: "123456" })).toContain("desafio");
        expect(await erros(validarReenvioDeCodigo, {})).toContain("desafio");
    });

    it("`lembrar` é opcional, mas só booleano", async () => {
        expect(await erros(validarLoginDispositivo, { desafio: DESAFIO, codigo: "123456", lembrar: true })).toEqual([]);
        expect(await erros(validarLoginDispositivo, { desafio: DESAFIO, codigo: "123456", lembrar: "talvez" })).toContain("lembrar");
    });

    it("o pedido de conta comprometida exige um e-mail válido", async () => {
        expect(await erros(validarSolicitarContaComprometida, { email: "ana@exemplo.com" })).toEqual([]);
        expect(await erros(validarSolicitarContaComprometida, { email: "isto-nao-e-email" })).toContain("email");
    });

    it("proteger agora: a senha é opcional (conta só Google) mas limitada", async () => {
        expect(await erros(validarProtegerAgora, {})).toEqual([]);
        expect(await erros(validarProtegerAgora, { senhaAtual: "x".repeat(73) })).toContain("senhaAtual");
    });
});

describe("rotuloDoDispositivo", () => {
    it.each([
        ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36", "Chrome · Windows"],
        ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0", "Edge · Windows"],
        ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605 Version/17.0 Safari/605.1.15", "Safari · macOS"],
        ["Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36", "Chrome · Android"],
        ["Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0", "Firefox · Linux"],
        ["", "Dispositivo desconhecido"],
        [undefined, "Dispositivo desconhecido"]
    ])("%s → %s", (ua, esperado) => {
        expect(rotuloDoDispositivo(ua)).toBe(esperado);
    });

    it("mascararEmail não revela o endereço inteiro", () => {
        expect(mascararEmail("anabeatriz@exemplo.com")).toBe("an***@exemplo.com");
        expect(mascararEmail("sem-arroba")).toBe("***");
        expect(mascararEmail(undefined)).toBe("***");
    });
});

describe("texto dos eventos de segurança", () => {
    it("todo tipo tem descrição legível, e um tipo desconhecido não quebra", () => {
        for (const tipo of Object.keys(EVENTOS_DE_SEGURANCA)) expect(descreverEvento(tipo).length).toBeGreaterThan(10);

        expect(descreverEvento("tipo_do_futuro")).toBe("Evento de segurança registrado.");
    });

    it("nenhuma descrição menciona código, token ou segredo em claro", () => {
        expect(JSON.stringify(EVENTOS_DE_SEGURANCA)).not.toMatch(/\d{6}|token=/);
    });
});
