import { beforeEach, describe, expect, it, vi } from "vitest";

/** Vídeo da vaga em Libras: transcrição obrigatória, só a empresa dona, legenda WebVTT conferida, arquivo órfão limpo. */

const m = vi.hoisted(() => ({
    midiaFindOne: vi.fn(),
    midiaCreate: vi.fn(),
    buscarVagaComEmpresa: vi.fn(),
    buscarPorId: vi.fn(),
    removerArquivoFisico: vi.fn(),
    gerarUrlAssinada: vi.fn()
}));

vi.mock("../models/index.js", () => ({ VagaMidia: { findOne: m.midiaFindOne, create: m.midiaCreate } }));
vi.mock("./VagaService.js", () => ({ default: { buscarVagaComEmpresa: m.buscarVagaComEmpresa, buscarPorId: m.buscarPorId } }));
vi.mock("./ArmazenamentoService.js", () => ({ default: { removerArquivoFisico: m.removerArquivoFisico } }));
vi.mock("../utils/supabaseStorage.js", () => ({ gerarUrlAssinada: m.gerarUrlAssinada }));
vi.mock("../middlewares/uploadMiddleware.js", () => ({
    urlPublica: (arquivo) => arquivo?.url ?? `/uploads/${arquivo?.filename}`,
    LIMITE_LEGENDA_BYTES: 256 * 1024
}));

const { default: Servico } = await import("./VagaMidiaService.js");

const EMPRESA = { id: "u-emp", tipoUsuario: "empresa" };
const OUTRA = { id: "u-outra", tipoUsuario: "empresa" };
const TRANSCRICAO = "Olá! Esta vaga é para assistente administrativo, de segunda a sexta.";
const VIDEO = { url: "vagas/u-emp/novo.mp4", mimetype: "video/mp4" };
const VTT = "WEBVTT\n\n00:00.000 --> 00:02.000\nOlá!\n";
const arquivoVtt = (texto) => ({ buffer: Buffer.from(texto, "utf8") });

function midia(extra = {}) {
    return {
        id: "md1", vagaId: "v1", videoCaminho: "vagas/u-emp/antigo.mp4", videoTipoMime: "video/mp4", legendaVtt: null, transcricao: TRANSCRICAO, descricao: null,
        update: vi.fn().mockImplementation(async function (v) { Object.assign(this, v); return this; }),
        destroy: vi.fn(),
        ...extra
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    m.buscarVagaComEmpresa.mockResolvedValue({ id: "v1", empresa: { usuarioId: "u-emp", statusAprovacao: "aprovada" } });
    m.buscarPorId.mockResolvedValue({ id: "v1" });
    m.midiaFindOne.mockResolvedValue(null);
    m.midiaCreate.mockImplementation(async (v) => ({ id: "md1", ...v }));
    m.gerarUrlAssinada.mockResolvedValue({ url: "https://assinada/video", expiraEm: "2026-11-05T00:00:00Z" });
    m.removerArquivoFisico.mockResolvedValue(true);
});

describe("salvarVideo", () => {
    it("cria o vídeo com a transcrição e devolve a URL ASSINADA (nunca o caminho)", async () => {
        const r = await Servico.salvarVideo("v1", VIDEO, { transcricao: `  ${TRANSCRICAO}  `, descricao: " Apresentação " }, EMPRESA);

        expect(m.midiaCreate.mock.calls[0][0]).toMatchObject({ vagaId: "v1", tipo: "video_libras", videoCaminho: "vagas/u-emp/novo.mp4", videoTipoMime: "video/mp4", transcricao: TRANSCRICAO, descricao: "Apresentação" });
        expect(r.video.url).toBe("https://assinada/video");
        expect(JSON.stringify(r)).not.toContain("vagas/u-emp/novo.mp4");
    });

    it("sem transcrição, o vídeo não é publicado e o arquivo recém-enviado é apagado", async () => {
        await expect(Servico.salvarVideo("v1", VIDEO, { transcricao: "curta" }, EMPRESA)).rejects.toMatchObject({ statusCode: 400 });

        expect(m.midiaCreate).not.toHaveBeenCalled();
        expect(m.removerArquivoFisico).toHaveBeenCalledWith("vagas/u-emp/novo.mp4", { privado: true });
    });

    it("sem arquivo, recusa", async () => {
        await expect(Servico.salvarVideo("v1", undefined, { transcricao: TRANSCRICAO }, EMPRESA)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("outra empresa não envia vídeo para a vaga alheia e o arquivo não fica órfão", async () => {
        await expect(Servico.salvarVideo("v1", VIDEO, { transcricao: TRANSCRICAO }, OUTRA)).rejects.toMatchObject({ statusCode: 403 });

        expect(m.midiaCreate).not.toHaveBeenCalled();
        expect(m.removerArquivoFisico).toHaveBeenCalledWith("vagas/u-emp/novo.mp4", { privado: true });
    });

    it("trocar o vídeo apaga o arquivo antigo e a legenda (o tempo das falas não vale para o vídeo novo)", async () => {
        const existente = midia({ legendaVtt: VTT });
        m.midiaFindOne.mockResolvedValue(existente);

        await Servico.salvarVideo("v1", VIDEO, { transcricao: TRANSCRICAO }, EMPRESA);

        expect(existente.update.mock.calls[0][0]).toMatchObject({ videoCaminho: "vagas/u-emp/novo.mp4", legendaVtt: null });
        expect(m.removerArquivoFisico).toHaveBeenCalledWith("vagas/u-emp/antigo.mp4", { privado: true });
        expect(m.midiaCreate).not.toHaveBeenCalled();
    });

    it("transcrição grande demais é recusada", async () => {
        await expect(Servico.salvarVideo("v1", VIDEO, { transcricao: "a".repeat(8001) }, EMPRESA)).rejects.toMatchObject({ statusCode: 400 });
    });
});

describe("salvarLegenda", () => {
    it("guarda a legenda WebVTT como texto, com a quebra de linha normalizada", async () => {
        const existente = midia();
        m.midiaFindOne.mockResolvedValue(existente);

        await Servico.salvarLegenda("v1", arquivoVtt("﻿WEBVTT\r\n\r\n00:00.000 --> 00:02.000\r\nOlá!\r\n"), EMPRESA);

        expect(existente.update).toHaveBeenCalledWith({ legendaVtt: "WEBVTT\n\n00:00.000 --> 00:02.000\nOlá!\n" });
    });

    it("sem vídeo antes, recusa: a legenda é de um vídeo", async () => {
        await expect(Servico.salvarLegenda("v1", arquivoVtt(VTT), EMPRESA)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("arquivo que não é WebVTT (ou não tem nenhuma fala) é recusado", async () => {
        m.midiaFindOne.mockResolvedValue(midia());

        await expect(Servico.salvarLegenda("v1", arquivoVtt("1\n00:00:01,000 --> 00:00:02,000\nSRT, não VTT"), EMPRESA)).rejects.toMatchObject({ statusCode: 400 });
        await expect(Servico.salvarLegenda("v1", arquivoVtt("WEBVTT\n\nsó cabeçalho"), EMPRESA)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("legenda acima de 256 KB é recusada", async () => {
        m.midiaFindOne.mockResolvedValue(midia());

        await expect(Servico.salvarLegenda("v1", { buffer: Buffer.alloc(256 * 1024 + 1, "a") }, EMPRESA)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("outra empresa não mexe na legenda alheia", async () => {
        await expect(Servico.salvarLegenda("v1", arquivoVtt(VTT), OUTRA)).rejects.toMatchObject({ statusCode: 403 });
    });

    it("removerLegenda limpa só a legenda", async () => {
        const existente = midia({ legendaVtt: VTT });
        m.midiaFindOne.mockResolvedValue(existente);

        await Servico.removerLegenda("v1", EMPRESA);

        expect(existente.update).toHaveBeenCalledWith({ legendaVtt: null });
    });
});

describe("obter, atualizar e remover", () => {
    it("quem pode ver a vaga vê o vídeo (a visibilidade é a da vaga); sem vídeo, nulo", async () => {
        expect(await Servico.obter("v1", null)).toBeNull();
        expect(m.buscarPorId).toHaveBeenCalledWith("v1", null);

        m.midiaFindOne.mockResolvedValue(midia({ legendaVtt: VTT }));
        const r = await Servico.obter("v1", null);

        expect(r.transcricao).toBe(TRANSCRICAO);
        expect(r.legendaVtt).toBe(VTT);
    });

    it("vaga que o público não vê: o vídeo também não aparece", async () => {
        m.buscarPorId.mockRejectedValue(Object.assign(new Error("Vaga não encontrada."), { statusCode: 404 }));

        await expect(Servico.obter("v1", null)).rejects.toMatchObject({ statusCode: 404 });
        expect(m.midiaFindOne).not.toHaveBeenCalled();
    });

    it("atualizar a transcrição mantém a regra do mínimo", async () => {
        const existente = midia();
        m.midiaFindOne.mockResolvedValue(existente);

        await expect(Servico.atualizarTextos("v1", { transcricao: "muito curta" }, EMPRESA)).rejects.toMatchObject({ statusCode: 400 });

        await Servico.atualizarTextos("v1", { transcricao: "Nova transcrição com mais de vinte caracteres." }, EMPRESA);
        expect(existente.update.mock.calls[0][0].transcricao).toMatch(/^Nova transcrição/);
    });

    it("remover apaga a linha e o arquivo; sem vídeo, não faz nada", async () => {
        const existente = midia();
        m.midiaFindOne.mockResolvedValue(existente);

        expect(await Servico.remover("v1", EMPRESA)).toEqual({ removido: true });
        expect(existente.destroy).toHaveBeenCalled();
        expect(m.removerArquivoFisico).toHaveBeenCalledWith("vagas/u-emp/antigo.mp4", { privado: true });

        m.midiaFindOne.mockResolvedValue(null);
        expect(await Servico.remover("v1", EMPRESA)).toEqual({ removido: false });
    });
});
