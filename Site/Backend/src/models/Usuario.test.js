import { describe, it, expect, vi } from "vitest";
import { Sequelize } from "sequelize";

/**
 * Como o `Usuario` vira JSON. O Sequelize é de verdade, mas sem conexão: `build` não toca o banco.
 */

vi.mock("../config/bancoDeDados.js", () => ({
    default: new Sequelize("postgres://usuario:senha@localhost:5432/teste", { logging: false, define: { underscored: true } })
}));

vi.mock("../utils/supabaseStorage.js", () => ({ resolverUrlExibicao: (valor) => valor }));

const { default: Usuario } = await import("./Usuario.js");

const contaCompleta = (extra = {}) =>
    Usuario.build({ nome: "Ana Souza", email: "ana@exemplo.com", tipoUsuario: "candidato", ...extra });

describe("Usuario.toJSON", () => {
    it("troca o sub do Google por um indicador de vínculo", () => {
        const json = contaCompleta({ googleId: "sub-secreto-do-google" }).toJSON();

        expect(json.googleVinculado).toBe(true);
        expect(json).not.toHaveProperty("googleId");
        expect(JSON.stringify(json)).not.toContain("sub-secreto-do-google");
    });

    it("conta sem Google sai com googleVinculado falso", () => {
        const json = contaCompleta({ googleId: null }).toJSON();

        expect(json.googleVinculado).toBe(false);
        expect(json).not.toHaveProperty("googleId");
    });

    it("não acrescenta googleVinculado quando a coluna nem foi carregada (consulta com colunas escolhidas)", () => {
        const usuario = contaCompleta();
        delete usuario.dataValues.googleId;

        const json = usuario.toJSON();

        expect(json).not.toHaveProperty("googleId");
        expect(json).not.toHaveProperty("googleVinculado");
        expect(json).toMatchObject({ nome: "Ana Souza" });
    });

    it("mantém os demais campos como estavam", () => {
        const json = contaCompleta({ googleId: "x" }).toJSON();

        expect(json).toMatchObject({ nome: "Ana Souza", email: "ana@exemplo.com", tipoUsuario: "candidato" });
    });

    it("é o que JSON.stringify usa, inclusive dentro de outro objeto", () => {
        const texto = JSON.stringify({ usuario: contaCompleta({ googleId: "sub-secreto" }) });

        expect(texto).toContain('"googleVinculado":true');
        expect(texto).not.toContain("sub-secreto");
    });
});

describe("Usuario.senhaHash", () => {
    it("aceita nulo: conta que entra só pelo Google ainda não tem senha (o banco exige o Google, ck_usuarios_senha_ou_google)", () => {
        expect(Usuario.rawAttributes.senhaHash.allowNull).toBe(true);
    });

    it("continua fora de qualquer resposta pelo escopo padrão", () => {
        expect(Usuario.options.defaultScope.attributes.exclude).toContain("senhaHash");
    });
});
