import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { validarAtualizacaoCandidato } from "./candidatoValidator.js";

/**
 * `PUT /candidatos/:id`: roda a cadeia real de validação sobre um corpo e devolve os campos
 * rejeitados. Sem banco e sem Express: só o express-validator.
 *
 * Protege a remoção de `experiencia` e `habilidades` (campos escalares que não existem no model
 * `Candidato` nem na tabela `candidatos`): o perfil detalhado vive em `candidato_experiencias` e
 * `candidato_habilidades`, gravados por `/perfil/:recurso`.
 */

const ID = "11111111-1111-4111-8111-111111111111";

async function validar(corpo, id = ID) {
    const req = { params: { id }, body: { ...corpo }, query: {}, headers: {} };

    for (const regra of validarAtualizacaoCandidato) {
        await regra.run(req);
    }

    return { rejeitados: validationResult(req).array().map((erro) => erro.path), corpo: req.body };
}

describe("validarAtualizacaoCandidato", () => {
    it("aceita o corpo que o cadastro e a edição de perfil enviam", async () => {
        const { rejeitados } = await validar({
            tituloProfissional: "Desenvolvedora",
            escolaridade: "Ensino técnico",
            biografia: "Resumo",
            cidade: "São Paulo",
            estado: "SP",
            linkedin: "https://www.linkedin.com/in/alguem"
        });

        expect(rejeitados).toEqual([]);
    });

    it("recusa identificador que não é UUID", async () => {
        const { rejeitados } = await validar({}, "nao-e-uuid");

        expect(rejeitados).toEqual(["id"]);
    });

    it.each([
        ["cpf", { cpf: "123" }],
        ["dataNascimento", { dataNascimento: "ontem" }],
        ["escolaridade", { escolaridade: "z".repeat(121) }],
        ["estado", { estado: "SAO" }],
        ["pais", { pais: "BRA" }],
        ["cep", { cep: "123" }],
        ["linkedin", { linkedin: "isto não é URL" }],
        ["github", { github: "isto não é URL" }]
    ])("recusa %s inválido", async (campo, corpo) => {
        const { rejeitados } = await validar(corpo);

        expect(rejeitados).toEqual([campo]);
    });

    it("normaliza o código do país para maiúsculas", async () => {
        const { rejeitados, corpo } = await validar({ pais: "br" });

        expect(rejeitados).toEqual([]);
        expect(corpo.pais).toBe("BR");
    });

    it("não valida mais `experiencia` nem `habilidades`: o campo é ignorado, não rejeitado", async () => {
        const { rejeitados } = await validar({
            experiencia: "x".repeat(5000),
            habilidades: "y".repeat(3000)
        });

        expect(rejeitados).toEqual([]);
    });
});
