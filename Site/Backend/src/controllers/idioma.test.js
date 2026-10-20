import { describe, it, expect, vi, beforeEach } from "vitest";

/** Os dois pontos dos controllers em que o idioma entra: salvar na conta e traduzir o aviso do currículo. */

vi.mock("../services/AutenticacaoService.js", () => ({ default: { alterarIdioma: vi.fn() } }));
vi.mock("../services/RecuperacaoSenhaService.js", () => ({ default: {} }));
vi.mock("../services/SessaoService.js", () => ({ default: {} }));
vi.mock("../services/CandidatoService.js", () => ({ default: { importarCurriculo: vi.fn() } }));
vi.mock("../middlewares/uploadMiddleware.js", () => ({ urlPublica: vi.fn() }));
vi.mock("../models/index.js", () => ({ Candidato: {} }));
vi.mock("../services/ArmazenamentoService.js", () => ({ default: {} }));

const { default: AutenticacaoService } = await import("../services/AutenticacaoService.js");
const { default: CandidatoService } = await import("../services/CandidatoService.js");
const { default: AutenticacaoController } = await import("./AutenticacaoController.js");
const { default: CandidatoController } = await import("./CandidatoController.js");

function criarRes() {
    const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
    return res;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("AutenticacaoController.alterarIdioma", () => {
    it("salva o idioma da conta autenticada e responde 200", async () => {
        AutenticacaoService.alterarIdioma.mockResolvedValue({ mensagem: "Idioma atualizado com sucesso.", idioma: "en" });
        const res = criarRes();
        const next = vi.fn();

        await AutenticacaoController.alterarIdioma({ user: { id: "u1" }, body: { idioma: "en" } }, res, next);

        expect(AutenticacaoService.alterarIdioma).toHaveBeenCalledWith("u1", "en");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            sucesso: true,
            mensagem: "Idioma atualizado com sucesso.",
            idioma: "en"
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("repassa o erro ao tratador de erros", async () => {
        const erro = new Error("falhou");
        AutenticacaoService.alterarIdioma.mockRejectedValue(erro);
        const next = vi.fn();

        await AutenticacaoController.alterarIdioma({ user: { id: "u1" }, body: { idioma: "en" } }, criarRes(), next);

        expect(next).toHaveBeenCalledWith(erro);
    });
});

describe("CandidatoController.importarCurriculo", () => {
    const AVISO_PT =
        "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar.";

    const chamar = async (idioma) => {
        CandidatoService.importarCurriculo.mockResolvedValue({ email: "a@b.com", aviso: AVISO_PT });
        const res = criarRes();

        await CandidatoController.importarCurriculo(
            {
                idioma,
                params: { id: "c1" },
                user: { id: "u1" },
                file: { buffer: Buffer.from("x"), mimetype: "application/pdf" }
            },
            res,
            vi.fn()
        );

        return res.json.mock.calls[0][0];
    };

    it("o aviso do rascunho sai no idioma de quem enviou o arquivo", async () => {
        expect((await chamar("pt")).rascunho.aviso).toBe(AVISO_PT);
        expect((await chamar("en")).rascunho.aviso).toMatch(/^Automatic keyword-based extraction/);
        expect((await chamar("es")).rascunho.aviso).toMatch(/^Extracción automática por palabras clave/);
    });

    it("o resto do rascunho não muda", async () => {
        expect((await chamar("en")).rascunho.email).toBe("a@b.com");
    });

    it("a mensagem de arquivo ausente é traduzida pelo embrulho de res.json (aqui, só a chave)", async () => {
        const res = criarRes();

        await CandidatoController.importarCurriculo({ idioma: "en", params: { id: "c1" }, user: {} }, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ sucesso: false, mensagem: "Envie um arquivo PDF ou DOCX." });
    });
});
