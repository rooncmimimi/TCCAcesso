import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Fale conosco: a mensagem chega à equipe de verdade, ou a pessoa é avisada de que não chegou. Nunca se finge
 * sucesso. O envio (Brevo) é simulado; o resto, incluindo o modelo do e-mail, é o real.
 */

vi.mock("./EmailService.js", () => ({ default: { disponivel: vi.fn(), enviar: vi.fn() } }));

const { default: env } = await import("../config/env.js");
const { default: EmailService } = await import("./EmailService.js");
const { default: ContatoService } = await import("./ContatoService.js");

const dados = (extra = {}) => ({
    nome: "Maria da Silva",
    email: "maria@exemplo.com",
    assunto: "duvida",
    mensagem: "Olá, gostaria de saber como funciona a candidatura.",
    ...extra
});

const destinoOriginal = env.contato.destinoEmail;

beforeEach(() => {
    vi.resetAllMocks();
    env.contato.destinoEmail = "equipe@acesso.test";
    EmailService.disponivel.mockReturnValue(true);
    EmailService.enviar.mockResolvedValue(undefined);
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    env.contato.destinoEmail = destinoOriginal;
    vi.restoreAllMocks();
});

describe("ContatoService.enviar", () => {
    it("encaminha a mensagem para o destino configurado, com o endereço da pessoa em 'responder para'", async () => {
        const { protocolo } = await ContatoService.enviar(dados());

        expect(protocolo).toMatch(/^ACE-[0-9A-F]{8}$/);
        expect(EmailService.enviar).toHaveBeenCalledTimes(1);

        const envio = EmailService.enviar.mock.calls[0][0];
        expect(envio.para).toBe("equipe@acesso.test");
        expect(envio.responderPara).toEqual({ email: "maria@exemplo.com", nome: "Maria da Silva" });
        expect(envio.tag).toBe("fale-conosco");
        expect(envio.assunto).toBe(`[Fale conosco] Dúvida sobre a plataforma (${protocolo})`);
        expect(envio.texto).toContain("Olá, gostaria de saber como funciona a candidatura.");
        expect(envio.texto).toContain("maria@exemplo.com");
        expect(envio.texto).toContain(protocolo);
    });

    it("cada mensagem recebe um protocolo diferente", async () => {
        const a = await ContatoService.enviar(dados());
        const b = await ContatoService.enviar(dados());

        expect(a.protocolo).not.toBe(b.protocolo);
    });

    it("não manda e-mail de confirmação para o endereço digitado (o formulário não vira disparador para terceiros)", async () => {
        await ContatoService.enviar(dados({ email: "vitima@exemplo.com" }));

        const destinatarios = EmailService.enviar.mock.calls.map(([envio]) => envio.para);
        expect(destinatarios).toEqual(["equipe@acesso.test"]);
    });

    it("escapa o que a pessoa escreveu no HTML do e-mail", async () => {
        await ContatoService.enviar(dados({ nome: "Ana <b>X</b>", mensagem: "<script>alert(1)</script> & mais" }));

        const { html } = EmailService.enviar.mock.calls[0][0];
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; mais");
        expect(html).toContain("Ana &lt;b&gt;X&lt;/b&gt;");
    });

    it("o assunto do e-mail nunca leva texto da pessoa (sem injeção de cabeçalho)", async () => {
        await ContatoService.enviar(dados({ nome: "Fulano\r\nBcc: alguem@exemplo.com", mensagem: "Linha 1\r\nBcc: outro@exemplo.com" }));

        const { assunto } = EmailService.enviar.mock.calls[0][0];
        expect(assunto).not.toMatch(/[\r\n]/);
        expect(assunto).not.toContain("Bcc");
        expect(assunto).not.toContain("Fulano");
    });

    it("sem a Brevo configurada, avisa que o envio não está disponível (503) e não finge sucesso", async () => {
        EmailService.disponivel.mockReturnValue(false);

        await expect(ContatoService.enviar(dados())).rejects.toMatchObject({
            statusCode: 503,
            message: expect.stringContaining("não está disponível")
        });
        expect(EmailService.enviar).not.toHaveBeenCalled();
    });

    it("sem destino configurado, também avisa (nenhum endereço é inventado)", async () => {
        env.contato.destinoEmail = null;

        await expect(ContatoService.enviar(dados())).rejects.toMatchObject({ statusCode: 503 });
        expect(EmailService.enviar).not.toHaveBeenCalled();
    });

    it("se o envio falhar, o erro chega à pessoa (não vira 'enviado')", async () => {
        const falha = Object.assign(new Error("Não foi possível enviar o e-mail agora."), { statusCode: 503 });
        EmailService.enviar.mockRejectedValue(falha);

        await expect(ContatoService.enviar(dados())).rejects.toBe(falha);
    });

    it("campo-isca preenchido: descarta sem enviar, sem erro, e sem dado pessoal no log", async () => {
        const { protocolo } = await ContatoService.enviar(dados({ website: "http://spam.exemplo" }));

        expect(protocolo).toMatch(/^ACE-/);
        expect(EmailService.enviar).not.toHaveBeenCalled();

        const registrado = JSON.stringify(console.warn.mock.calls);
        expect(registrado).toContain("descartado_campo_isca");
        expect(registrado).not.toMatch(/maria@exemplo|Maria da Silva|spam\.exemplo|candidatura/);
    });

    it("assunto fora da lista é recusado", async () => {
        await expect(ContatoService.enviar(dados({ assunto: "inventado" }))).rejects.toMatchObject({ statusCode: 400 });
        expect(EmailService.enviar).not.toHaveBeenCalled();
    });
});
