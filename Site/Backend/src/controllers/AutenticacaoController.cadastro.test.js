import { describe, it, expect, vi, beforeEach } from "vitest";
import { UniqueConstraintError } from "sequelize";

/**
 * Como o controller traduz os erros do cadastro (achado 19 da auditoria): a violação de uma coluna
 * única do banco vira 409 com a mensagem da coluna, e não o 500 genérico. Os serviços são simulados;
 * `ErroApi` e o `UniqueConstraintError` do Sequelize são os de verdade.
 */

vi.mock("../services/AutenticacaoService.js", () => ({
    default: { cadastrarCandidato: vi.fn(), cadastrarEmpresa: vi.fn() }
}));
vi.mock("../services/RecuperacaoSenhaService.js", () => ({ default: {} }));
vi.mock("../services/SessaoService.js", () => ({ default: {} }));

const { default: AutenticacaoService } = await import("../services/AutenticacaoService.js");
const { default: AutenticacaoController } = await import("./AutenticacaoController.js");

const requisicao = () => ({ body: {}, headers: {}, ip: "10.0.0.1", get: vi.fn() });
const resposta = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};

/** O erro que o Sequelize lança para uma coluna única, com o nome da coluna e o valor que repetiu. */
const unicidade = (coluna, restricao = `usuarios_${coluna}_key`) =>
    new UniqueConstraintError({
        message: "Validation error",
        errors: [{ message: `${coluna} must be unique`, path: coluna, value: "valor-secreto" }],
        fields: { [coluna]: "valor-secreto" },
        parent: { constraint: restricao, detail: `Key (${coluna})=(valor-secreto) already exists.` }
    });

const cadastrar = async (erro, metodo = "cadastrarCandidato") => {
    AutenticacaoService[metodo].mockRejectedValue(erro);
    const next = vi.fn();
    await AutenticacaoController[metodo](requisicao(), resposta(), next);
    return next.mock.calls[0][0];
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("cadastro: violação de coluna única", () => {
    it.each([
        ["google_id", "Esta conta Google já está vinculada a outra conta."],
        ["email", "Este e-mail já está cadastrado."],
        ["cpf", "Este CPF já está cadastrado."]
    ])("%s vira 409 com a mensagem da coluna", async (coluna, mensagem) => {
        const erro = await cadastrar(unicidade(coluna));

        expect(erro).toMatchObject({ statusCode: 409, message: mensagem });
    });

    it("o cadastro de empresa também traduz (CNPJ)", async () => {
        const erro = await cadastrar(unicidade("cnpj"), "cadastrarEmpresa");

        expect(erro).toMatchObject({ statusCode: 409, message: "Este CNPJ já está cadastrado." });
    });

    it("reconhece a coluna pelo nome da restrição quando o erro não traz os campos", async () => {
        const semCampos = new UniqueConstraintError({
            errors: [],
            fields: {},
            parent: { constraint: "usuarios_google_id_unico" }
        });

        expect(await cadastrar(semCampos)).toMatchObject({ statusCode: 409, message: expect.stringContaining("Google") });
    });

    it("uma coluna que o cadastro não conhece vira 409 com mensagem geral", async () => {
        const erro = await cadastrar(unicidade("apelido"));

        expect(erro).toMatchObject({ statusCode: 409, message: "Já existe um cadastro com estes dados." });
    });

    it("não deixa o valor repetido nem o texto do banco chegarem ao cliente", async () => {
        const erro = await cadastrar(unicidade("email"));

        expect(JSON.stringify({ mensagem: erro.message, detalhes: erro.detalhes })).not.toContain("valor-secreto");
    });
});

describe("cadastro: os demais erros seguem como antes", () => {
    it("um ErroApi (por exemplo, e-mail já cadastrado) segue como está", async () => {
        const regra = Object.assign(new Error("Este e-mail já está cadastrado."), { statusCode: 409 });
        // `instanceof ErroApi`: usa a classe de verdade.
        const { default: ErroApi } = await import("../utils/ErroApi.js");
        const erro = await cadastrar(ErroApi.conflito(regra.message));

        expect(erro).toMatchObject({ statusCode: 409, message: "Este e-mail já está cadastrado." });
    });

    it("uma falha inesperada continua virando 500 amigável, com a causa guardada para o log", async () => {
        const causa = new Error("conexão perdida");

        const erro = await cadastrar(causa);

        expect(erro).toMatchObject({ statusCode: 500, message: "Não foi possível concluir o cadastro agora. Tente novamente." });
        expect(erro.causaOriginal).toBe(causa);
    });
});
