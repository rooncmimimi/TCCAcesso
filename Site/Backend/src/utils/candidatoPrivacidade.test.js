import { beforeEach, describe, it, expect, vi } from "vitest";
import { Op } from "sequelize";

/**
 * Privacidade do candidato: o que um terceiro autenticado vê (`aplicarPrivacidadeCandidato`) e quem
 * pode ver o quê (`podeVerDadosPrivados`, `podeVerDadosDaCandidatura`). Banco e models são mockados
 * (o projeto não tem banco de teste isolado); as funções de visibilidade em si são puras.
 */

const { candidaturaFindOne, empresaFindOne, estaBloqueadoEntre } = vi.hoisted(() => ({
    candidaturaFindOne: vi.fn(),
    empresaFindOne: vi.fn(),
    estaBloqueadoEntre: vi.fn()
}));

vi.mock("../models/index.js", () => ({
    Candidatura: { findOne: candidaturaFindOne },
    Vaga: {},
    Empresa: { findOne: empresaFindOne }
}));
vi.mock("../services/BloqueioService.js", () => ({ default: { estaBloqueadoEntre } }));

const {
    aplicarPrivacidadeCandidato,
    podeVerDadosDaCandidatura,
    podeVerDadosPrivados,
    empresaTemCandidaturaAtivaDoCandidato,
    STATUS_SEM_ACESSO_DA_EMPRESA
} = await import("./candidatoPrivacidade.js");

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

function candidatoComDeficiencia(comoInstancia, extras = {}) {
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
        curriculoNome: "Meu CV.pdf",
        exibirDeficienciaNoPerfil: false,
        ...extras,
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

/** Liga o usuário ao candidato como um registro incluído (propriedade solta mais `dataValues`). */
function comUsuario(candidato, usuario, comoInstancia) {
    const registro = comoInstancia ? new Instancia(usuario) : usuario;

    if (comoInstancia) {
        candidato.dataValues.usuario = registro;
    }

    candidato.usuario = registro;
}

describe.each([
    ["objeto simples", false],
    ["instância Sequelize", true]
])("aplicarPrivacidadeCandidato (%s)", (_nome, comoInstancia) => {
    const serializar = (candidato) => JSON.parse(JSON.stringify(candidato));

    it("para terceiro, a categoria da deficiência é PRIVADA por padrão", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia), false));

        expect(visto.deficiencias).toBeUndefined();
        expect(JSON.stringify(visto)).not.toContain("Deficiência visual");
        expect(JSON.stringify(visto)).not.toContain(OBSERVACAO);
    });

    it("só mostra a categoria quando a PRÓPRIA pessoa ligou a exibição, e nunca o texto livre do vínculo", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia, { exibirDeficienciaNoPerfil: true }), false));

        expect(visto.deficiencias).toHaveLength(1);
        expect(visto.deficiencias[0].nome).toBe("Deficiência visual");
        expect(visto.deficiencias[0].CandidatoDeficiencia).toBeUndefined();
        expect(JSON.stringify(visto)).not.toContain(OBSERVACAO);
    });

    it("exibir a categoria no perfil NÃO libera nenhum outro dado privado", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia, { exibirDeficienciaNoPerfil: true }), false));

        for (const campo of ["cpf", "endereco", "cep", "necessidadesAcessibilidade", "curriculo", "exibirDeficienciaNoPerfil"]) {
            expect(visto[campo]).toBeUndefined();
        }
    });

    it("para terceiro, continua escondendo CPF, endereço, CEP, necessidades e currículo", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia), false));

        expect(visto.cidade).toBe("São Paulo");
        for (const campo of ["cpf", "endereco", "cep", "necessidadesAcessibilidade", "curriculo"]) {
            expect(visto[campo]).toBeUndefined();
        }
    });

    it("para a própria pessoa e o administrador (autorizado), entrega tudo, inclusive o vínculo", () => {
        const visto = serializar(aplicarPrivacidadeCandidato(candidatoComDeficiencia(comoInstancia), true));

        expect(visto.deficiencias[0].CandidatoDeficiencia.observacoes).toBe(OBSERVACAO);
        expect(visto.cpf).toBe("12345678901");
    });

    it("o contato liberado da candidatura devolve só o e-mail e o NOME do currículo, nada além (nunca o caminho)", () => {
        const base = candidatoComDeficiencia(comoInstancia);
        comUsuario(base, { id: "u1", nome: "Ana", email: "ana@exemplo.com", telefone: "11999999999", senhaHash: "x" }, comoInstancia);

        const visto = serializar(aplicarPrivacidadeCandidato(base, false, { contatoLiberado: true }));

        expect(visto.usuario.email).toBe("ana@exemplo.com");
        expect(visto.curriculoNome).toBe("Meu CV.pdf");
        expect(visto.curriculo).toBeUndefined();
        expect(visto.usuario.nome).toBe("Ana");
        expect(visto.usuario.telefone).toBeUndefined();
        expect(visto.usuario.senhaHash).toBeUndefined();
        expect(visto.cpf).toBeUndefined();
    });

    it("sem contato liberado, o e-mail e o nome do currículo somem", () => {
        const base = candidatoComDeficiencia(comoInstancia);
        comUsuario(base, { id: "u1", nome: "Ana", email: "ana@exemplo.com" }, comoInstancia);

        const visto = serializar(aplicarPrivacidadeCandidato(base, false));
        expect(visto.usuario.email).toBeUndefined();
        expect(visto.curriculoNome).toBeUndefined();
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

describe("quem pode ver o quê", () => {
    const candidato = { id: "c1", usuarioId: "u-candidato" };
    const dono = { id: "u-candidato", tipoUsuario: "candidato" };
    const admin = { id: "u-admin", tipoUsuario: "administrador" };
    const empresaA = { id: "u-empresa-a", tipoUsuario: "empresa" };
    const outroCandidato = { id: "u-outro", tipoUsuario: "candidato" };

    beforeEach(() => {
        vi.clearAllMocks();
        estaBloqueadoEntre.mockResolvedValue(false);
        empresaFindOne.mockResolvedValue({ id: "emp-a" });
        candidaturaFindOne.mockResolvedValue(null);
    });

    it("dados privados: só a própria pessoa e o administrador", async () => {
        expect(await podeVerDadosPrivados(candidato, dono)).toBe(true);
        expect(await podeVerDadosPrivados(candidato, admin)).toBe(true);
        expect(await podeVerDadosPrivados(candidato, outroCandidato)).toBe(false);
        expect(await podeVerDadosPrivados(candidato, null)).toBe(false);
    });

    it("dados privados: uma empresa NUNCA, nem com candidatura ativa", async () => {
        candidaturaFindOne.mockResolvedValue({ id: "cand-1", status: "em_analise" });

        expect(await podeVerDadosPrivados(candidato, empresaA)).toBe(false);
        expect(candidaturaFindOne).not.toHaveBeenCalled();
    });

    it("dados da candidatura: a empresa dona da vaga, com candidatura ativa, vê", async () => {
        candidaturaFindOne.mockResolvedValue({ id: "cand-1", status: "pendente" });

        expect(await podeVerDadosDaCandidatura(candidato, empresaA)).toBe(true);
    });

    it("a consulta olha só as vagas DA empresa e só candidaturas que não estão canceladas nem rejeitadas", async () => {
        await empresaTemCandidaturaAtivaDoCandidato(empresaA, "c1");

        const consulta = candidaturaFindOne.mock.calls[0][0];
        expect(consulta.include[0].where).toEqual({ empresaId: "emp-a" });
        expect(consulta.include[0].required).toBe(true);
        expect(consulta.where.candidatoId).toBe("c1");
        expect(consulta.where.status[Op.notIn]).toEqual(STATUS_SEM_ACESSO_DA_EMPRESA);
        expect(STATUS_SEM_ACESSO_DA_EMPRESA).toEqual(["cancelada", "rejeitada"]);
    });

    it("sem candidatura ativa em vaga dela (ou só em vaga de OUTRA empresa), a empresa não vê nada", async () => {
        candidaturaFindOne.mockResolvedValue(null);

        expect(await podeVerDadosDaCandidatura(candidato, empresaA)).toBe(false);
    });

    it("bloqueio entre as partes nega mesmo com candidatura ativa", async () => {
        estaBloqueadoEntre.mockResolvedValue(true);
        candidaturaFindOne.mockResolvedValue({ id: "cand-1", status: "pendente" });

        expect(await podeVerDadosDaCandidatura(candidato, empresaA)).toBe(false);
    });

    it("outro candidato e visitante sem sessão não veem os dados da candidatura", async () => {
        expect(await podeVerDadosDaCandidatura(candidato, outroCandidato)).toBe(false);
        expect(await podeVerDadosDaCandidatura(candidato, null)).toBe(false);
    });

    it("a própria pessoa e o administrador sempre veem", async () => {
        expect(await podeVerDadosDaCandidatura(candidato, dono)).toBe(true);
        expect(await podeVerDadosDaCandidatura(candidato, admin)).toBe(true);
    });

    it("usuário de empresa sem registro de empresa não vê", async () => {
        empresaFindOne.mockResolvedValue(null);

        expect(await empresaTemCandidaturaAtivaDoCandidato(empresaA, "c1")).toBe(false);
    });
});
