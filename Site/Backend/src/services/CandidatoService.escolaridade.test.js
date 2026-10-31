import { describe, it, expect, vi } from "vitest";

/**
 * `escolaridade` vazia vira NULL. O cadastro envia `escolaridade: ""` quando a pessoa não escolhe
 * nada; na produção isso virou linhas com string vazia ao lado de linhas com NULL para o mesmo
 * significado ("não informada").
 *
 * Banco, models e Storage são mockados: só a função pura `filtrarCampos` é exercida.
 */

vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn() } }));
vi.mock("../models/index.js", () => ({
    Candidato: {},
    Usuario: {},
    Deficiencia: {},
    CandidatoDeficiencia: {},
    Candidatura: {},
    Vaga: {},
    Empresa: {},
    UsuarioBloqueado: {},
    RegistroAuditoria: {}
}));
vi.mock("../utils/supabaseStorage.js", () => ({ gerarUrlAssinada: vi.fn() }));
vi.mock("../utils/extrairTextoDocumento.js", () => ({ extrairTextoDocumento: vi.fn() }));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: vi.fn() } }));
vi.mock("./BloqueioService.js", () => ({ default: { estaBloqueadoEntre: vi.fn() } }));

const { default: CandidatoService } = await import("./CandidatoService.js");

describe("CandidatoService.filtrarCampos: escolaridade", () => {
    it("string vazia vira NULL", () => {
        expect(CandidatoService.filtrarCampos({ escolaridade: "" })).toEqual({ escolaridade: null });
    });

    it("preserva um valor escolhido", () => {
        expect(CandidatoService.filtrarCampos({ escolaridade: "Ensino técnico" })).toEqual({
            escolaridade: "Ensino técnico"
        });
    });

    it("preserva NULL explícito e não inventa o campo quando ele não veio", () => {
        expect(CandidatoService.filtrarCampos({ escolaridade: null })).toEqual({ escolaridade: null });
        expect(CandidatoService.filtrarCampos({ cidade: "São Paulo" })).toEqual({ cidade: "São Paulo" });
    });

    it("não mexe em outros campos vazios (limpar biografia continua gravando string vazia)", () => {
        expect(CandidatoService.filtrarCampos({ biografia: "" })).toEqual({ biografia: "" });
    });
});
