import { describe, it, expect, vi } from "vitest";

/**
 * `aplicarPrivacidadeCandidato`: o que um terceiro autenticado vê do candidato. Banco e models são
 * mockados (o projeto não tem banco de teste isolado); a função em si é pura.
 */

vi.mock("../models/index.js", () => ({ Candidatura: {}, Vaga: {}, Empresa: {} }));
vi.mock("../services/BloqueioService.js", () => ({ default: { estaBloqueadoEntre: vi.fn() } }));

const { aplicarPrivacidadeCandidato } = await import("./candidatoPrivacidade.js");

/**
 * Imita o que importa de uma instância Sequelize: `dataValues`, `setDataValue`, `toJSON` e, como no
 * Sequelize, um getter/setter por atributo que lê e grava em `dataValues` (é por isso que atribuir
 * `candidato.cpf = undefined` some da serialização). Os registros incluídos (`incluidos`, como a lista
 * de deficiências e o vínculo `CandidatoDeficiencia`) são propriedade solta MAIS `dataValues`, sem
 * setter: para escondê-los é preciso mexer em `dataValues`, e é isso que a correção faz.
 */
class Instancia {
    constructor(valores, incluidos = []) {
        this.dataValues = { ...valores };

        for (const chave of Object.keys(valores)) {
            if (incluidos.includes(chave)) {
                this[chave] = valores[chave];
                continue;
            }

            Object.defineProperty(this, chave, {
                enumerable: true,
                get: () => this.dataValues[chave],
                set: (valor) => {
                    this.dataValues[chave] = valor;
                }
            });
        }
    }

    setDataValue(chave, valor) {
        this.dataValues[chave] = valor;
    }

    toJSON() {
        return { ...this.dataValues };
    }
}

const OBSERVACAO = "Detalhe de saúde escrito pelo candidato";

function candidatoComDeficiencia(comoInstancia) {
    const fabricar = (valores, incluidos) => (comoInstancia ? new Instancia(valores, incluidos) : valores);

    return fabricar({
        id: "c1",
        usuarioId: "u1",
        cidade: "São Paulo",
        cpf: "12345678901",
        endereco: "Rua A, 1",
        cep: "01001000",
        necessidadesAcessibilidade: "Leitor de tela",
        curriculo: "privado/curriculo.pdf",
        deficiencias: [
            fabricar(
                {
                    id: "d1",
                    nome: "Deficiência visual",
                    descricao: "Cegueira ou baixa visão",
                    CandidatoDeficiencia: fabricar({ observacoes: OBSERVACAO })
                },
                ["CandidatoDeficiencia"]
            )
        ]
    }, ["deficiencias"]);
}

describe.each([
    ["objeto simples", false],
    ["instância Sequelize", true]
])("aplicarPrivacidadeCandidato (%s)", (_nome, comoInstancia) => {
    const serializar = (candidato) => JSON.parse(JSON.stringify(candidato));

    it("para terceiro, mantém a categoria da deficiência e esconde o texto livre do vínculo", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia), false));

        expect(visto.deficiencias).toHaveLength(1);
        expect(visto.deficiencias[0].nome).toBe("Deficiência visual");
        expect(visto.deficiencias[0].descricao).toBe("Cegueira ou baixa visão");
        expect(visto.deficiencias[0].CandidatoDeficiencia).toBeUndefined();
        expect(JSON.stringify(visto)).not.toContain(OBSERVACAO);
    });

    it("para terceiro, continua escondendo CPF, endereço, CEP, necessidades e currículo", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia), false));

        expect(visto.cidade).toBe("São Paulo");
        for (const campo of ["cpf", "endereco", "cep", "necessidadesAcessibilidade", "curriculo"]) {
            expect(visto[campo]).toBeUndefined();
        }
    });

    it("para quem pode ver os dados privados (dono, administrador, empresa com candidatura), entrega o vínculo", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia), true));

        expect(visto.deficiencias[0].CandidatoDeficiencia.observacoes).toBe(OBSERVACAO);
        expect(visto.cpf).toBe("12345678901");
    });
});

describe("aplicarPrivacidadeCandidato (casos de borda)", () => {
    it("aceita candidato sem a lista de deficiências", () => {
        expect(() => aplicarPrivacidadeCandidato({ id: "c1", cidade: "SP" }, false)).not.toThrow();
    });

    it("devolve o que recebeu quando não há candidato", () => {
        expect(aplicarPrivacidadeCandidato(null, false)).toBeNull();
    });
});
