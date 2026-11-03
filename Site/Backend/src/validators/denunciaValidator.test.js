import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { validarAtribuicaoDenuncia } from "./denunciaValidator.js";

/** `PATCH /admin/denuncias/:id/atribuir`: o corpo só pode trazer `forcar` (booleano); quem assume vem da sessão. */

const ID = "11111111-1111-4111-8111-111111111111";

async function validar(corpo, id = ID) {
    const req = { params: { id }, body: corpo, query: {}, headers: {} };

    for (const regra of validarAtribuicaoDenuncia) {
        await regra.run(req);
    }

    return validationResult(req).array().map((erro) => erro.path);
}

describe("validarAtribuicaoDenuncia", () => {
    it("aceita sem corpo (o caso comum de 'Atribuir a mim')", async () => {
        expect(await validar({})).toEqual([]);
    });

    it.each([[true], [false], ["true"], ["false"]])("aceita forcar = %j", async (forcar) => {
        expect(await validar({ forcar })).toEqual([]);
    });

    it.each([["talvez"], [2], [{}]])("recusa forcar = %j", async (forcar) => {
        expect(await validar({ forcar })).toEqual(["forcar"]);
    });

    it("recusa identificador que não é UUID", async () => {
        expect(await validar({}, "nao-e-uuid")).toEqual(["id"]);
    });

    it("não existe campo para escolher quem assume: um id enviado no corpo não é lido pelo controller", async () => {
        // O validador não precisa barrar `administradorId`: o controller só repassa `forcar`, e o serviço grava
        // sempre o administrador da sessão (coberto em DenunciaService.atribuir.test.js).
        expect(await validar({ administradorId: "outra-pessoa" })).toEqual([]);
    });
});
