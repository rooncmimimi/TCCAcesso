import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `UploadService` nunca toca o Storage diretamente (isso já aconteceu em
 * `criarProcessadorArmazenamento`, uploadMiddleware.js, antes de chegar
 * aqui) — todos os testes mockam `Arquivo` (Sequelize) e as funções puras
 * de `uploadMiddleware.js`/`supabaseStorage.js`. Nenhum acesso a banco ou
 * Storage reais.
 */

vi.mock("../models/index.js", () => ({
    Arquivo: { create: vi.fn() }
}));

vi.mock("../middlewares/uploadMiddleware.js", () => ({
    urlPublica: vi.fn((arquivo) => `caminho/${arquivo.originalname}`),
    tipoDoArquivo: vi.fn(() => "imagem")
}));

vi.mock("../utils/supabaseStorage.js", () => ({
    storageHabilitado: true,
    removerArquivo: vi.fn(async () => true)
}));

const { Arquivo } = await import("../models/index.js");
const { removerArquivo } = await import("../utils/supabaseStorage.js");
const { default: UploadService } = await import("./UploadService.js");

const solicitante = { id: "user-1" };

function arquivoFake(nome) {
    return {
        originalname: nome,
        mimetype: "image/png",
        size: 1024
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("UploadService.registrarVarios", () => {
    it("registra múltiplos arquivos e preserva a ordem de entrada no resultado", async () => {
        // Arrange — cada chamada resolve num momento diferente, de propósito,
        // pra provar que Promise.all não embaralha a ordem mesmo quando as
        // promises terminam fora de ordem.
        Arquivo.create
            .mockImplementationOnce(async (dados) => {
                await new Promise((r) => setTimeout(r, 15));
                return { id: "arquivo-A", ...dados, tamanhoBytes: String(dados.tamanhoBytes) };
            })
            .mockImplementationOnce(async (dados) => ({
                id: "arquivo-B",
                ...dados,
                tamanhoBytes: String(dados.tamanhoBytes)
            }))
            .mockImplementationOnce(async (dados) => {
                await new Promise((r) => setTimeout(r, 5));
                return { id: "arquivo-C", ...dados, tamanhoBytes: String(dados.tamanhoBytes) };
            });

        const arquivos = [arquivoFake("a.png"), arquivoFake("b.png"), arquivoFake("c.png")];

        // Act
        const resultado = await UploadService.registrarVarios(arquivos, "postagem", solicitante);

        // Assert
        expect(resultado.map((r) => r.id)).toEqual(["arquivo-A", "arquivo-B", "arquivo-C"]);
        expect(Arquivo.create).toHaveBeenCalledTimes(3);
    });

    it("propaga o erro quando um dos arquivos falha ao registrar (mesmo contrato do loop sequencial anterior)", async () => {
        // Arrange
        Arquivo.create
            .mockResolvedValueOnce({ id: "arquivo-A", tamanhoBytes: "1024" })
            .mockRejectedValueOnce(new Error("violação de constraint"))
            .mockResolvedValueOnce({ id: "arquivo-C", tamanhoBytes: "1024" });

        const arquivos = [arquivoFake("a.png"), arquivoFake("b.png"), arquivoFake("c.png")];

        // Act / Assert
        await expect(
            UploadService.registrarVarios(arquivos, "postagem", solicitante)
        ).rejects.toThrow("violação de constraint");
    });

    it("respeita o limite de arquivos definido pelo multer (uploadAnexos.array('arquivos', 4)) — não impõe limite próprio adicional", async () => {
        // Arrange — 4 é o máximo que o middleware já permite chegar aqui;
        // o service não precisa (e não deve) reimplementar esse limite.
        Arquivo.create.mockImplementation(async (dados) => ({ id: dados.nomeOriginal, tamanhoBytes: "1024" }));
        const arquivos = [arquivoFake("1.png"), arquivoFake("2.png"), arquivoFake("3.png"), arquivoFake("4.png")];

        // Act
        const resultado = await UploadService.registrarVarios(arquivos, "postagem", solicitante);

        // Assert
        expect(resultado).toHaveLength(4);
        expect(Arquivo.create).toHaveBeenCalledTimes(4);
    });

    it("rejeita quando nenhum arquivo é enviado, sem chamar o banco", async () => {
        await expect(UploadService.registrarVarios([], "postagem", solicitante)).rejects.toThrow(
            "Nenhum arquivo foi enviado."
        );
        expect(Arquivo.create).not.toHaveBeenCalled();
    });
});

describe("UploadService.registrar", () => {
    it("rejeita categoria inválida antes de tocar no banco", async () => {
        await expect(
            UploadService.registrar(arquivoFake("a.png"), "categoria-inexistente", solicitante)
        ).rejects.toThrow("Categoria de arquivo inválida.");
        expect(Arquivo.create).not.toHaveBeenCalled();
    });
});

describe("UploadService.removerArquivoFisico — cleanup", () => {
    it("nunca tenta remover uma URL completa antiga (não há caminho de Storage pra apagar)", async () => {
        const resultado = await UploadService.removerArquivoFisico("https://storage.antigo/arquivo.png");
        expect(resultado).toBe(false);
        expect(removerArquivo).not.toHaveBeenCalled();
    });

    it("remove pelo caminho relativo do Storage quando o Storage está habilitado", async () => {
        const resultado = await UploadService.removerArquivoFisico("postagens/user-1/arquivo.png", {
            privado: true
        });
        expect(resultado).toBe(true);
        expect(removerArquivo).toHaveBeenCalledWith("postagens/user-1/arquivo.png", { privado: true });
    });

    it("retorna false para caminho vazio, sem chamar o Storage", async () => {
        const resultado = await UploadService.removerArquivoFisico(null);
        expect(resultado).toBe(false);
        expect(removerArquivo).not.toHaveBeenCalled();
    });
});
