import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { validarCadastroCandidato, validarCadastroEmpresa, validarLogin } from "./autenticacaoValidator.js";
import {
    validarEsqueciSenha,
    validarRedefinirSenha,
    validarReenviarConfirmacaoCadastro,
    validarSolicitarTrocaEmail
} from "./sessaoValidator.js";

/**
 * Os validadores conferem o **formato** do e-mail, mas não o reescrevem: ele segue para o serviço
 * como foi digitado (sem espaços nas pontas), e a forma canônica é aplicada num lugar só
 * (`utils/email.js`). Antes, só algumas rotas usavam `.normalizeEmail()`: o cadastro gravava
 * `maria.silva@gmail.com` como `mariasilva@gmail.com`, e o login procurava o texto digitado (achado 2
 * da auditoria). Rodam de verdade, sobre uma requisição de mentira, sem banco e sem rede.
 */

async function rodar(cadeias, corpo) {
    const req = { body: { ...corpo }, headers: {}, query: {}, params: {}, cookies: {} };
    for (const cadeia of cadeias) await cadeia.run(req);
    return { req, erros: validationResult(req).array().filter((e) => e.path === "email" || e.path === "novoEmail") };
}

const DIGITADO = "  Maria.Silva+acesso@Gmail.com ";
const SEM_ESPACOS = "Maria.Silva+acesso@Gmail.com";

const CORPO_CADASTRO = {
    nome: "Maria Silva",
    senha: "Senha@1234",
    telefone: "11999999999",
    cpf: "12345678901",
    pais: "br",
    dataNascimento: "1990-01-01",
    cidade: "São Paulo",
    estado: "sp"
};

const ROTAS = [
    ["cadastro de candidato", validarCadastroCandidato, (email) => ({ ...CORPO_CADASTRO, email }), "email"],
    ["cadastro de empresa", validarCadastroEmpresa, (email) => ({ nome: "RH", senha: "Senha@1234", cnpj: "12345678000190", razaoSocial: "Empresa Ltda", email }), "email"],
    ["login", validarLogin, (email) => ({ email, senha: "x" }), "email"],
    ["esqueci minha senha", validarEsqueciSenha, (email) => ({ email }), "email"],
    ["redefinir senha pelo código", validarRedefinirSenha, (email) => ({ email, codigo: "123456", novaSenha: "Senha@1234" }), "email"],
    ["reenvio da confirmação", validarReenviarConfirmacaoCadastro, (email) => ({ email }), "email"],
    ["troca de e-mail", validarSolicitarTrocaEmail, (email) => ({ senhaAtual: "x", novoEmail: email }), "novoEmail"]
];

describe.each(ROTAS)("e-mail no validador de %s", (_nome, cadeias, corpo, campo) => {
    it("deixa o e-mail como foi digitado, só sem os espaços das pontas", async () => {
        const { req } = await rodar(cadeias, corpo(DIGITADO));
        expect(req.body[campo]).toBe(SEM_ESPACOS);
    });

    it("continua aceitando um e-mail válido", async () => {
        const { erros } = await rodar(cadeias, corpo(DIGITADO));
        expect(erros).toEqual([]);
    });

    it("continua recusando o que não é e-mail", async () => {
        const { erros } = await rodar(cadeias, corpo("isto-nao-e-email"));
        expect(erros.length).toBeGreaterThan(0);
    });
});

describe("limite de tamanho do e-mail", () => {
    it.each([
        ["cadastro de candidato", validarCadastroCandidato, (email) => ({ ...CORPO_CADASTRO, email })],
        ["troca de e-mail", validarSolicitarTrocaEmail, (email) => ({ senhaAtual: "x", novoEmail: email })]
    ])("%s recusa e-mail com mais de 150 caracteres", async (_nome, cadeias, corpo) => {
        const longo = `${"a".repeat(145)}@b.com`;
        const { erros } = await rodar(cadeias, corpo(longo));
        expect(erros.length).toBeGreaterThan(0);
    });
});
