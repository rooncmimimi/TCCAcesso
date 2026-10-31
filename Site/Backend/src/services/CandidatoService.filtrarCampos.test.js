import { describe, it, expect, vi } from "vitest";

/**
 * `CandidatoService.filtrarCampos`: a allowlist de `PUT /candidatos/:id`. Só o que está em
 * `CAMPOS_EDITAVEIS` chega ao `candidato.update`; o resto do corpo é descartado.
 *
 * Nenhum teste toca o banco real: o projeto não tem banco de teste isolado, então banco, models e
 * Storage são mockados e só a função pura é exercida.
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

describe("CandidatoService.filtrarCampos", () => {
    it("mantém os campos editáveis do perfil", () => {
        const corpo = {
            cpf: "12345678901",
            dataNascimento: "1990-01-31",
            genero: "feminino",
            biografia: "Resumo",
            escolaridade: "Ensino técnico",
            linkedin: "https://www.linkedin.com/in/alguem",
            github: "https://github.com/alguem",
            cidade: "São Paulo",
            estado: "SP",
            pais: "BR",
            endereco: "Rua A, 1",
            cep: "01001000",
            disponibilidade: "Integral",
            pretensaoSalarial: "3500.00",
            tituloProfissional: "Desenvolvedora",
            necessidadesAcessibilidade: "Leitor de tela"
        };

        expect(CandidatoService.filtrarCampos(corpo)).toEqual(corpo);
    });

    it("descarta `experiencia` e `habilidades`: o perfil detalhado vai por /perfil/:recurso", () => {
        const resultado = CandidatoService.filtrarCampos({
            cidade: "São Paulo",
            experiencia: "5 anos",
            habilidades: "js, sql"
        });

        expect(resultado).toEqual({ cidade: "São Paulo" });
    });

    it("descarta campos que o cliente não pode definir por este caminho", () => {
        const resultado = CandidatoService.filtrarCampos({
            cidade: "São Paulo",
            // `curriculo` só entra pelo upload dedicado (validação de assinatura e bucket privado).
            curriculo: "qualquer/texto.pdf",
            curriculoNome: "x.pdf",
            usuarioId: "outro-usuario",
            id: "outro-id",
            cpfHash: "hash-forjado",
            cpfCifrado: "cifra-forjada"
        });

        expect(resultado).toEqual({ cidade: "São Paulo" });
    });

    it("ignora campos ausentes (undefined), mas preserva null e string vazia para limpar", () => {
        const resultado = CandidatoService.filtrarCampos({ cidade: undefined, genero: null, biografia: "" });

        expect(resultado).toEqual({ genero: null, biografia: "" });
    });
});
