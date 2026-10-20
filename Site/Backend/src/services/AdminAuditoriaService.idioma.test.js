import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/index.js", () => ({ Usuario: {} }));
vi.mock("../models/RegistroAuditoria.js", () => ({ default: { findAndCountAll: vi.fn(), create: vi.fn() } }));

const { default: RegistroAuditoria } = await import("../models/RegistroAuditoria.js");
const { default: AdminAuditoriaService } = await import("./AdminAuditoriaService.js");

const registro = (descricao) => ({
    toJSON: () => ({ id: "r1", acao: "bloquear_usuario", descricao, metadados: { motivo: "Spam" } })
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe("AdminAuditoriaService.listar", () => {
    it("traduz a descrição do registro para o idioma de quem lê, sem mexer no resto", async () => {
        RegistroAuditoria.findAndCountAll.mockResolvedValue({
            rows: [registro("Usuário Beto (beto@exemplo.com) foi bloqueado."), registro("Texto antigo sem tradução."), registro(null)],
            count: 3
        });

        const resposta = await AdminAuditoriaService.listar({}, "en");

        expect(resposta.logs.map((log) => log.descricao)).toEqual([
            "User Beto (beto@exemplo.com) was blocked.",
            "Texto antigo sem tradução.",
            null
        ]);
        expect(resposta.logs[0]).toMatchObject({ id: "r1", acao: "bloquear_usuario", metadados: { motivo: "Spam" } });
        expect(resposta.total).toBe(3);
    });

    it("em português devolve a descrição como foi gravada", async () => {
        RegistroAuditoria.findAndCountAll.mockResolvedValue({
            rows: [registro("Empresa Acme foi suspensa.")],
            count: 1
        });

        const resposta = await AdminAuditoriaService.listar({}, "pt");

        expect(resposta.logs[0].descricao).toBe("Empresa Acme foi suspensa.");
    });
});
