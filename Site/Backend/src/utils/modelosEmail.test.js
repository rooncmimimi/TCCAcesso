import { describe, it, expect } from "vitest";

import { modeloContaGoogle } from "./modelosEmail.js";

describe("modeloContaGoogle", () => {
    it("avisa que um Google foi vinculado", () => {
        const { assunto, html, texto } = modeloContaGoogle({ nome: "Ana", acao: "vinculada" });

        expect(assunto).toMatch(/vinculado/);
        expect(html).toContain("Conta Google vinculada");
        expect(html).toContain("também serve para entrar");
        expect(texto).toContain("vinculada");
    });

    it("avisa que o Google foi desvinculado e que a entrada passa a ser só por e-mail e senha", () => {
        const { assunto, html, texto } = modeloContaGoogle({ nome: "Ana", acao: "desvinculada" });

        expect(assunto).toMatch(/desvinculado/);
        expect(html).toContain("Conta Google desvinculada");
        expect(html).toContain("apenas com e-mail e senha");
        expect(texto).toContain("desvinculado");
    });

    it.each(["vinculada", "desvinculada"])("diz o que fazer se a pessoa não reconhece a ação (%s)", (acao) => {
        const { html, texto } = modeloContaGoogle({ nome: "Ana", acao });

        expect(html).toContain("troque sua senha");
        expect(texto).toContain("troque sua senha");
    });

    it("escapa o nome, que vem do usuário, antes de colocá-lo no HTML", () => {
        const { html } = modeloContaGoogle({ nome: '<script>alert("x")</script>', acao: "vinculada" });

        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("cumprimenta sem nome quando não há nome", () => {
        expect(modeloContaGoogle({ nome: null, acao: "vinculada" }).html).toContain("Olá!");
    });
});
