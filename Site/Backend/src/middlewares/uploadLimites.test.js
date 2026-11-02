import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";

/**
 * Limites e validação real dos uploads, de ponta a ponta: um Express de verdade com o `multer` de
 * verdade, recebendo `multipart/form-data` pela rede (nada de req/res falsos). O que se confere é o que o
 * usuário recebe: tipo, assinatura binária, tamanho por categoria e a mensagem do erro.
 *
 * Sem Storage (o ambiente de teste não o configura) e sem banco.
 */

const { default: env } = await import("../config/env.js");
const { default: erroMiddleware } = await import("./erroMiddleware.js");
const {
    uploadImagem,
    uploadDocumento,
    uploadAnexos,
    uploadCurriculoParaImportar,
    criarProcessadorArmazenamento,
    conferirConteudoDoArquivo,
    MIME_IMPORTAVEIS
} = await import("./uploadMiddleware.js");

const MB = 1024 * 1024;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF = Buffer.from("%PDF-1.4\n");
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(8)]);

/** Arquivo com a assinatura certa e o tamanho pedido (o resto é preenchimento). */
const arquivo = (inicio, tamanho) => Buffer.concat([inicio, Buffer.alloc(Math.max(0, tamanho - inicio.length))]);

let servidor;
let base;

beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = express();
    const ok = (req, res) =>
        res.json({ ok: true, arquivos: [req.file, ...(req.files ?? [])].filter(Boolean).map((a) => a.size) });

    app.post("/imagem", uploadImagem.single("arquivo"), criarProcessadorArmazenamento({ pasta: "t" }), ok);
    app.post("/documento", uploadDocumento.single("arquivo"), criarProcessadorArmazenamento({ pasta: "t", privado: true }), ok);
    app.post("/anexos", uploadAnexos.array("arquivos", 4), criarProcessadorArmazenamento({ pasta: "t", privado: true }), ok);
    app.post("/importar", uploadCurriculoParaImportar.single("curriculo"), conferirConteudoDoArquivo(), ok);
    app.use(erroMiddleware);

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });
    base = `http://127.0.0.1:${servidor.address().port}`;
});

afterAll(() => {
    servidor.close();
    vi.restoreAllMocks();
});

async function enviar(rota, campo, buffer, tipo, nome = "arquivo") {
    const form = new FormData();
    form.append(campo, new Blob([buffer], { type: tipo }), nome);
    const resposta = await fetch(`${base}${rota}`, { method: "POST", body: form });
    const corpo = await resposta.json().catch(() => ({}));

    return { status: resposta.status, mensagem: corpo.mensagem ?? "", corpo };
}

describe("limites configurados", () => {
    it("imagem e documento: 5 MB; vídeo: 50 MB (os valores de .env.example e do render.yaml)", () => {
        expect(env.security.maxUploadBytes).toBe(5 * MB);
        expect(env.security.maxVideoUploadBytes).toBe(50 * MB);
    });
});

describe("foto de perfil e capa (imagem)", () => {
    it("aceita PNG dentro do limite", async () => {
        const r = await enviar("/imagem", "arquivo", arquivo(PNG, 1 * MB), "image/png");

        expect(r.status).toBe(200);
    });

    it("aceita imagem de exatamente 5 MB", async () => {
        expect((await enviar("/imagem", "arquivo", arquivo(PNG, 5 * MB), "image/png")).status).toBe(200);
    });

    it("recusa imagem acima de 5 MB e diz os limites", async () => {
        const r = await enviar("/imagem", "arquivo", arquivo(PNG, 5 * MB + 100), "image/png");

        expect(r.status).toBe(400);
        expect(r.mensagem).toContain("5MB");
        expect(r.mensagem).toContain("50MB");
    });

    it.each([
        ["GIF", "image/gif"],
        ["PDF", "application/pdf"],
        ["vídeo", "video/mp4"]
    ])("recusa %s com mensagem de formato", async (_nome, tipo) => {
        const r = await enviar("/imagem", "arquivo", arquivo(PNG, 1024), tipo);

        expect(r.status).toBe(400);
        expect(r.mensagem).toMatch(/PNG, JPEG ou WEBP/);
    });

    it("recusa arquivo que declara ser PNG mas não é (assinatura binária)", async () => {
        const r = await enviar("/imagem", "arquivo", Buffer.from("isto é só texto, não uma imagem"), "image/png");

        expect(r.status).toBe(400);
        expect(r.mensagem).toMatch(/conteúdo do arquivo não corresponde/);
    });
});

describe("currículo e documentos (PDF, DOC, DOCX)", () => {
    it("aceita PDF e DOCX dentro do limite e recusa acima de 5 MB", async () => {
        expect((await enviar("/documento", "arquivo", arquivo(PDF, 1 * MB), "application/pdf")).status).toBe(200);
        expect(
            (await enviar("/documento", "arquivo", arquivo(DOCX, 1 * MB), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .status
        ).toBe(200);
        expect((await enviar("/documento", "arquivo", arquivo(PDF, 5 * MB + 100), "application/pdf")).status).toBe(400);
    });

    it("não aceita imagem nem vídeo como documento", async () => {
        expect((await enviar("/documento", "arquivo", arquivo(PNG, 1024), "image/png")).status).toBe(400);
        expect((await enviar("/documento", "arquivo", arquivo(MP4, 1024), "video/mp4")).status).toBe(400);
    });
});

describe("anexos de publicação (imagem e vídeo)", () => {
    it("aceita vídeo MP4 de 20 MB (acima do limite de imagem) e de exatamente 50 MB", async () => {
        expect((await enviar("/anexos", "arquivos", arquivo(MP4, 20 * MB), "video/mp4")).status).toBe(200);
        expect((await enviar("/anexos", "arquivos", arquivo(MP4, 50 * MB), "video/mp4")).status).toBe(200);
    });

    it("recusa vídeo acima de 50 MB", async () => {
        const r = await enviar("/anexos", "arquivos", arquivo(MP4, 50 * MB + 100), "video/mp4");

        expect(r.status).toBe(400);
        expect(r.mensagem).toContain("50MB");
    });

    it("a imagem anexada continua limitada a 5 MB, mesmo no mesmo envio que aceita vídeo grande", async () => {
        const r = await enviar("/anexos", "arquivos", arquivo(PNG, 6 * MB), "image/png");

        expect(r.status).toBe(400);
        expect(r.mensagem).toBe("Arquivo muito grande. Limite de 5MB para este tipo.");
    });

    it("recusa documento como anexo de publicação", async () => {
        const r = await enviar("/anexos", "arquivos", arquivo(PDF, 1024), "application/pdf");

        expect(r.status).toBe(400);
        expect(r.mensagem).toMatch(/imagens .* ou vídeos/);
    });

    it("recusa um MP4 de mentira (texto com o tipo de vídeo)", async () => {
        const r = await enviar("/anexos", "arquivos", Buffer.from("não sou um vídeo, só texto qualquer"), "video/mp4");

        expect(r.status).toBe(400);
        expect(r.mensagem).toMatch(/conteúdo do arquivo não corresponde/);
    });
});

describe("importação de dados do currículo", () => {
    it("só aceita PDF e DOCX (o .doc antigo não tem extração)", async () => {
        expect(Object.keys(MIME_IMPORTAVEIS).sort()).toEqual([
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]);

        const doc = await enviar("/importar", "curriculo", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]), "application/msword");

        expect(doc.status).toBe(400);
        expect(doc.mensagem).toBe("Formato inválido. Para importar os dados, envie um PDF ou DOCX.");
    });

    it("confere a assinatura do arquivo (antes só o tipo declarado era conferido)", async () => {
        const r = await enviar("/importar", "curriculo", Buffer.from("texto puro disfarçado de PDF, bem maior que 8 bytes"), "application/pdf");

        expect(r.status).toBe(400);
        expect(r.mensagem).toMatch(/conteúdo do arquivo não corresponde/);
    });

    it("aceita um PDF válido, sem guardá-lo em lugar nenhum", async () => {
        const r = await enviar("/importar", "curriculo", arquivo(PDF, 2 * MB), "application/pdf");

        expect(r.status).toBe(200);
        expect(r.corpo.arquivos).toEqual([2 * MB]);
    });

    it("recusa arquivo grande demais", async () => {
        const r = await enviar("/importar", "curriculo", arquivo(PDF, 5 * MB + 100), "application/pdf");

        expect(r.status).toBe(400);
        expect(r.mensagem).toContain("5MB");
    });
});

describe("quantidade e campo", () => {
    it("mais de 4 anexos: erro claro, não o genérico de upload", async () => {
        const form = new FormData();
        for (let i = 0; i < 5; i += 1) form.append("arquivos", new Blob([arquivo(PNG, 100)], { type: "image/png" }), `${i}.png`);
        const resposta = await fetch(`${base}/anexos`, { method: "POST", body: form });
        const corpo = await resposta.json();

        expect(resposta.status).toBe(400);
        expect(corpo.mensagem).toBe("Há mais arquivos do que o permitido nesta ação.");
    });

    it("campo de arquivo errado: erro claro", async () => {
        const r = await enviar("/imagem", "outro-campo", arquivo(PNG, 100), "image/png");

        expect(r.status).toBe(400);
        expect(r.mensagem).toBe("O arquivo foi enviado no campo errado.");
    });
});
