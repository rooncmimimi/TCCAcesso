import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `criarProcessadorArmazenamento` processa até 4 arquivos por requisição
 * (`uploadAnexos.array("arquivos", 4)`, em `POST /postagens`). Se o arquivo N falhar depois de os
 * anteriores já irem para o Storage, eles precisam ser removidos, porque a requisição falha antes
 * de qualquer linha no banco apontar para eles. O Storage é mockado, e os testes conferem o
 * argumento exato passado a `removerArquivo`.
 */

vi.mock("../utils/supabaseStorage.js", () => ({
    storageHabilitado: true,
    enviarArquivo: vi.fn(),
    removerArquivo: vi.fn(async () => true)
}));

const { enviarArquivo, removerArquivo } = await import("../utils/supabaseStorage.js");
const { criarProcessadorArmazenamento } = await import("./uploadMiddleware.js");

const PNG_VALIDO = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function arquivoFake(nome, { size = 1024 } = {}) {
    return {
        originalname: nome,
        mimetype: "image/png",
        buffer: PNG_VALIDO,
        size
    };
}

function criarReq(files) {
    return { files, user: { id: "user-1" } };
}

function criarNextCapturado() {
    const chamadas = [];
    const next = (erro) => chamadas.push(erro);
    return { next, chamadas };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("criarProcessadorArmazenamento — cleanup de falha parcial no lote", () => {
    it("Cenário A: todos os arquivos enviados com sucesso — sem limpeza, next() sem erro", async () => {
        enviarArquivo.mockImplementation(async (buffer, caminho) => caminho);
        const middleware = criarProcessadorArmazenamento({ pasta: () => "postagens/user-1", privado: true });
        const req = criarReq([arquivoFake("1.png"), arquivoFake("2.png"), arquivoFake("3.png"), arquivoFake("4.png")]);
        const { next, chamadas } = criarNextCapturado();

        await middleware(req, {}, next);

        expect(chamadas).toEqual([undefined]);
        expect(removerArquivo).not.toHaveBeenCalled();
        expect(req.files.every((a) => a.url)).toBe(true);
    });

    it("Cenário B (2º arquivo falha): remove só o 1º já enviado e propaga o erro original do 2º", async () => {
        const erroStorage = new Error("falha de rede com o Storage");
        enviarArquivo
            .mockImplementationOnce(async (buffer, caminho) => caminho)
            .mockImplementationOnce(async () => {
                throw erroStorage;
            });
        const middleware = criarProcessadorArmazenamento({ pasta: () => "postagens/user-1", privado: true });
        const req = criarReq([arquivoFake("1.png"), arquivoFake("2.png")]);
        const { next, chamadas } = criarNextCapturado();

        await middleware(req, {}, next);

        expect(chamadas).toHaveLength(1);
        expect(chamadas[0].causaOriginal).toBe(erroStorage);
        expect(chamadas[0].message).not.toMatch(/excluir|limpeza/i);
        expect(removerArquivo).toHaveBeenCalledTimes(1);
        expect(removerArquivo).toHaveBeenCalledWith(
            expect.stringMatching(/^postagens\/user-1\//),
            { privado: true }
        );
    });

    it("Cenário C (3º arquivo falha): remove os 2 já enviados (1º e 2º), nunca o 4º (nunca chegou a ser tentado)", async () => {
        const erroStorage = new Error("bucket recusou o arquivo");
        enviarArquivo
            .mockImplementationOnce(async (buffer, caminho) => caminho)
            .mockImplementationOnce(async (buffer, caminho) => caminho)
            .mockImplementationOnce(async () => {
                throw erroStorage;
            });
        const middleware = criarProcessadorArmazenamento({ pasta: () => "postagens/user-1", privado: true });
        const req = criarReq([
            arquivoFake("1.png"),
            arquivoFake("2.png"),
            arquivoFake("3.png"),
            arquivoFake("4.png")
        ]);
        const { next, chamadas } = criarNextCapturado();

        await middleware(req, {}, next);

        // Só 3 chamadas a `enviarArquivo`: o loop para no 3º, e o 4º nunca é tentado.
        expect(enviarArquivo).toHaveBeenCalledTimes(3);
        expect(removerArquivo).toHaveBeenCalledTimes(2);
        expect(chamadas).toHaveLength(1);
        expect(chamadas[0].causaOriginal).toBe(erroStorage);
    });

    it("isolamento: a limpeza de uma requisição nunca usa caminhos de outra chamada anterior", async () => {
        // Primeira chamada com sucesso total, sem nada para limpar.
        enviarArquivo.mockImplementation(async (buffer, caminho) => caminho);
        const middleware = criarProcessadorArmazenamento({ pasta: () => "postagens/user-1", privado: true });
        const primeiraReq = criarReq([arquivoFake("antigo.png")]);
        await middleware(primeiraReq, {}, criarNextCapturado().next);
        expect(removerArquivo).not.toHaveBeenCalled();

        // Segunda chamada, com falha no 2º arquivo.
        enviarArquivo
            .mockImplementationOnce(async (buffer, caminho) => caminho)
            .mockImplementationOnce(async () => {
                throw new Error("falha");
            });
        const segundaReq = criarReq([arquivoFake("novo-1.png"), arquivoFake("novo-2.png")]);
        const { next, chamadas } = criarNextCapturado();
        await middleware(segundaReq, {}, next);

        // Só o arquivo da segunda requisição é removido, nunca "antigo.png".
        expect(removerArquivo).toHaveBeenCalledTimes(1);
        expect(removerArquivo.mock.calls[0][0]).not.toContain("antigo");
        expect(chamadas).toHaveLength(1);
    });
});
