import { describe, it, expect } from "vitest";
import {
    modeloConfirmacaoCadastro,
    modeloConfirmacaoTrocaEmail,
    modeloContaBloqueada,
    modeloEmpresaSuspensa,
    modeloRecuperacaoSenha,
    modeloSenhaAlterada
} from "./modelosEmail.js";

const IDIOMAS = ["pt", "en", "es"];
const LANG_HTML = { pt: "pt-BR", en: "en", es: "es" };

const MODELOS = {
    confirmacaoCadastro: (idioma) =>
        modeloConfirmacaoCadastro({
            nome: "Ana",
            linkConfirmacao: "https://acesso.exemplo/confirmar-email?codigo=123456",
            codigo: "123456",
            minutosValidade: 15,
            idioma
        }),
    recuperacaoSenha: (idioma) =>
        modeloRecuperacaoSenha({
            nome: "Ana",
            codigo: "654321",
            linkRedefinir: "https://acesso.exemplo/redefinir-senha?token=abc",
            minutosValidade: 15,
            idioma
        }),
    trocaEmail: (idioma) =>
        modeloConfirmacaoTrocaEmail({ nome: "Ana", codigo: "111222", minutosValidade: 15, idioma }),
    contaBloqueada: (idioma) => modeloContaBloqueada({ nome: "Ana", motivo: "Spam repetido", idioma }),
    empresaSuspensa: (idioma) => modeloEmpresaSuspensa({ nome: "Acme", motivo: "Dados falsos", idioma }),
    senhaAlterada: (idioma) => modeloSenhaAlterada({ nome: "Ana", idioma })
};

describe.each(Object.entries(MODELOS))("modelo %s", (_nome, gerar) => {
    it("devolve assunto, html e texto nos três idiomas, cada um diferente dos outros", () => {
        const porIdioma = Object.fromEntries(IDIOMAS.map((idioma) => [idioma, gerar(idioma)]));

        for (const idioma of IDIOMAS) {
            const { assunto, html, texto } = porIdioma[idioma];

            expect(assunto.length).toBeGreaterThan(5);
            expect(html).toContain(`<html lang="${LANG_HTML[idioma]}">`);
            expect(texto.length).toBeGreaterThan(20);
            expect(html).not.toMatch(/undefined|\[object/);
            expect(texto).not.toMatch(/undefined|\[object/);
        }

        expect(new Set(IDIOMAS.map((idioma) => porIdioma[idioma].assunto)).size).toBe(3);
        expect(new Set(IDIOMAS.map((idioma) => porIdioma[idioma].texto)).size).toBe(3);
        expect(new Set(IDIOMAS.map((idioma) => porIdioma[idioma].html)).size).toBe(3);
    });

    it("sem idioma ou com idioma desconhecido, sai em português como antes", () => {
        const padrao = gerar(undefined);
        const desconhecido = gerar("fr");

        expect(padrao).toEqual(gerar("pt"));
        expect(desconhecido).toEqual(gerar("pt"));
        expect(padrao.html).toContain('lang="pt-BR"');
    });
});

describe("conteúdo dos e-mails", () => {
    it("o assunto de cada fluxo está no idioma certo", () => {
        expect(MODELOS.confirmacaoCadastro("pt").assunto).toBe("Confirme seu e-mail — ACESSO");
        expect(MODELOS.confirmacaoCadastro("en").assunto).toBe("Confirm your email — ACESSO");
        expect(MODELOS.confirmacaoCadastro("es").assunto).toBe("Confirma tu correo electrónico — ACESSO");
        expect(MODELOS.recuperacaoSenha("en").assunto).toBe("Password reset — ACESSO");
        expect(MODELOS.senhaAlterada("es").assunto).toBe("Tu contraseña fue cambiada — ACESSO");
        expect(MODELOS.contaBloqueada("en").assunto).toBe("Your account was blocked — ACESSO");
        expect(MODELOS.empresaSuspensa("es").assunto).toBe("Tu empresa fue suspendida — ACESSO");
    });

    it("o código, o link, o nome e os minutos aparecem em qualquer idioma", () => {
        for (const idioma of IDIOMAS) {
            const { html, texto } = MODELOS.confirmacaoCadastro(idioma);

            expect(html).toContain("123456");
            expect(html).toContain("https://acesso.exemplo/confirmar-email?codigo=123456");
            expect(html).toContain("Ana");
            expect(html).toContain("15");
            expect(texto).toContain("123456");
            expect(texto).toContain("15");
        }
    });

    it("sem link de confirmação, o e-mail só fala do código e não menciona botão", () => {
        const { html, texto } = modeloConfirmacaoCadastro({
            nome: "Ana",
            linkConfirmacao: null,
            codigo: "123456",
            minutosValidade: 15,
            idioma: "en"
        });

        expect(html).toContain("123456");
        expect(html).not.toContain("<a href");
        expect(html).not.toMatch(/button below/i);
        expect(texto).not.toMatch(/https?:/);
    });

    it("recuperação de senha sem link mantém o código e tira o botão, em qualquer idioma", () => {
        for (const idioma of IDIOMAS) {
            const { html, texto } = modeloRecuperacaoSenha({
                nome: "Ana",
                codigo: "654321",
                linkRedefinir: null,
                minutosValidade: 15,
                idioma
            });

            expect(html).toContain("654321");
            expect(html).not.toContain("<a href");
            expect(texto).toContain("654321");
        }
    });

    it("o motivo do moderador sai como foi escrito (sem tradução) e escapado, com o rótulo no idioma", () => {
        const { html, texto } = modeloContaBloqueada({ nome: "Ana", motivo: "Spam <b>repetido</b> & links", idioma: "en" });

        expect(html).toContain("Reason:");
        expect(html).toContain("Spam &lt;b&gt;repetido&lt;/b&gt; &amp; links");
        expect(html).not.toContain("<b>repetido</b>");
        expect(texto).toContain("Reason: Spam <b>repetido</b> & links");
    });

    it("sem motivo, o e-mail de moderação não tem a linha de motivo", () => {
        for (const idioma of IDIOMAS) {
            const { html, texto } = modeloEmpresaSuspensa({ nome: "Acme", motivo: null, idioma });

            expect(html).not.toMatch(/Motivo:|Reason:/);
            expect(texto).not.toMatch(/Motivo:|Reason:/);
        }
    });

    it("sem nome, a saudação continua correta em cada idioma", () => {
        expect(modeloSenhaAlterada({ idioma: "pt" }).html).toContain("Olá!");
        expect(modeloSenhaAlterada({ idioma: "en" }).html).toContain("Hello!");
        expect(modeloSenhaAlterada({ idioma: "es" }).html).toContain("¡Hola!");
    });

    it("escapa o nome para não injetar HTML", () => {
        const { html } = modeloSenhaAlterada({ nome: '<script>alert("x")</script>', idioma: "es" });

        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("nenhum modelo em inglês ou espanhol deixa a frase do rodapé em português", () => {
        for (const idioma of ["en", "es"]) {
            for (const gerar of Object.values(MODELOS)) {
                expect(gerar(idioma).html).not.toContain("e-mail automático do ACESSO");
            }
        }
    });
});
