import { describe, it, expect, vi, afterEach } from "vitest";

import { LADO_MAXIMO, prepararImagemParaDescricao } from "./imagemParaDescricao";

/**
 * A imagem que vai ao modelo de visão: tipo declarado pelos BYTES (não pelo `type` do Blob, que
 * vem errado quando a imagem chega por `fetch` de uma URL assinada) e reduzida antes de enviar.
 *
 * Sem canvas — como aqui, no jsdom — a função devolve a imagem como veio, só com o tipo certo:
 * perder a redução é melhor do que perder o recurso.
 */

const blobCom = (bytes: number[], type = "") => new Blob([new Uint8Array(bytes)], { type });

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const WEBP = [...[0x52, 0x49, 0x46, 0x46], ...[0x1a, 0, 0, 0], ...[0x57, 0x45, 0x42, 0x50]];

afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
});

describe("prepararImagemParaDescricao: o tipo vem dos bytes", () => {
    it("Blob sem type nenhum: reconhece PNG", async () => {
        const { arquivo, nome } = await prepararImagemParaDescricao(blobCom(PNG));

        expect(arquivo.type).toBe("image/png");
        expect(nome).toBe("imagem.png");
    });

    it("type errado (octet-stream, como vem da URL assinada): corrige para JPEG", async () => {
        // Era o que fazia o backend recusar a imagem ao EDITAR a descrição de um anexo
        // publicado: a assinatura do arquivo não combinava com o tipo declarado.
        const { arquivo, nome } = await prepararImagemParaDescricao(
            blobCom(JPEG, "application/octet-stream")
        );

        expect(arquivo.type).toBe("image/jpeg");
        expect(nome).toBe("imagem.jpg");
    });

    it("reconhece WEBP pelo par RIFF/WEBP", async () => {
        const { arquivo, nome } = await prepararImagemParaDescricao(blobCom(WEBP));

        expect(arquivo.type).toBe("image/webp");
        expect(nome).toBe("imagem.webp");
    });

    it("quando o type já está certo, não refaz o Blob", async () => {
        const original = blobCom(PNG, "image/png");
        const { arquivo } = await prepararImagemParaDescricao(original);

        expect(arquivo).toBe(original);
    });

    it("bytes que não são imagem conhecida: mantém o que o Blob declarou, sem inventar", async () => {
        const { arquivo } = await prepararImagemParaDescricao(blobCom([1, 2, 3, 4], "image/gif"));

        expect(arquivo.type).toBe("image/gif");
    });
});

describe("prepararImagemParaDescricao: redução", () => {
    /** Canvas de mentira: registra o tamanho pedido e devolve um JPEG pequeno. */
    function fingirCanvas() {
        const canvas = {
            width: 0,
            height: 0,
            getContext: () => ({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() }),
            toBlob: (retorno: (b: Blob | null) => void) => retorno(blobCom(JPEG, "image/jpeg"))
        };

        vi.spyOn(document, "createElement").mockImplementation(((etiqueta: string) =>
            etiqueta === "canvas" ? canvas : document.createElementNS("http://www.w3.org/1999/xhtml", etiqueta)) as typeof document.createElement);

        return canvas;
    }

    it("reduz o lado maior para o limite, mantendo a proporção", async () => {
        const canvas = fingirCanvas();
        const criar = vi.fn().mockResolvedValue({ width: 4000, height: 2000, close: vi.fn() });
        (globalThis as { createImageBitmap?: unknown }).createImageBitmap = criar;

        // 1 MB: grande o bastante para valer a pena reduzir.
        const grande = new Blob([new Uint8Array(1024 * 1024)], { type: "image/png" });
        const { arquivo, nome } = await prepararImagemParaDescricao(grande);

        expect(canvas.width).toBe(LADO_MAXIMO);
        expect(canvas.height).toBe(LADO_MAXIMO / 2);
        expect(arquivo.type).toBe("image/jpeg");
        expect(nome).toBe("imagem.jpg");
        expect(arquivo.size).toBeLessThan(grande.size);
    });

    it("respeita a orientação do EXIF (foto tirada em pé não é descrita de lado)", async () => {
        fingirCanvas();
        const criar = vi.fn().mockResolvedValue({ width: 3000, height: 4000, close: vi.fn() });
        (globalThis as { createImageBitmap?: unknown }).createImageBitmap = criar;

        await prepararImagemParaDescricao(new Blob([new Uint8Array(1024 * 1024)], { type: "image/jpeg" }));

        expect(criar).toHaveBeenCalledWith(expect.anything(), { imageOrientation: "from-image" });
    });

    it("imagem já pequena e dentro do limite: não reencoda à toa", async () => {
        fingirCanvas();
        (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi
            .fn()
            .mockResolvedValue({ width: 600, height: 400, close: vi.fn() });

        const pequena = blobCom(PNG, "image/png");
        const { arquivo } = await prepararImagemParaDescricao(pequena);

        expect(arquivo).toBe(pequena);
    });

    it("se a decodificação falhar, devolve a imagem como veio", async () => {
        (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi
            .fn()
            .mockRejectedValue(new Error("imagem corrompida"));

        const { arquivo, nome } = await prepararImagemParaDescricao(blobCom(PNG, "image/png"));

        expect(arquivo.type).toBe("image/png");
        expect(nome).toBe("imagem.png");
    });
});
