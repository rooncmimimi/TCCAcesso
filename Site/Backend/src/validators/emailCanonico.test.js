import { describe, it, expect } from "vitest";

import { validarCadastroCandidato, validarLogin } from "./autenticacaoValidator.js";
import { validarEsqueciSenha, validarReenviarConfirmacaoCadastro, validarSolicitarTrocaEmail } from "./sessaoValidator.js";

/**
 * Como cada rota reescreve o e-mail antes de o serviço consultar o banco. Os validadores do projeto
 * rodam de verdade sobre uma requisição de mentira, sem banco e sem rede.
 *
 * O cadastro grava `maria.silva@gmail.com` como `mariasilva@gmail.com`: `normalizeEmail()` do
 * express-validator remove pontos e "+etiqueta" de endereços do Gmail. Quem não passa pela mesma
 * regra procura outro texto no banco (achado 2 da auditoria).
 */

async function emailDepoisDe(cadeias, corpo) {
    const req = { body: { ...corpo }, headers: {}, query: {}, params: {}, cookies: {} };
    for (const cadeia of cadeias) await cadeia.run(req);
    return req.body.email ?? req.body.novoEmail;
}

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

const DIGITADO = "Maria.Silva+acesso@Gmail.com";
const CANONICO = "mariasilva@gmail.com";

describe("e-mail depois do validador de cada rota (como é hoje)", () => {
    it("cadastro: grava a forma canônica (sem pontos, sem +etiqueta, em minúsculas)", async () => {
        expect(await emailDepoisDe(validarCadastroCandidato, { ...CORPO_CADASTRO, email: DIGITADO })).toBe(CANONICO);
    });

    it("esqueci minha senha: usa a forma canônica", async () => {
        expect(await emailDepoisDe(validarEsqueciSenha, { email: DIGITADO })).toBe(CANONICO);
    });

    it("reenvio da confirmação de cadastro: usa a forma canônica", async () => {
        expect(await emailDepoisDe(validarReenviarConfirmacaoCadastro, { email: DIGITADO })).toBe(CANONICO);
    });

    it("troca de e-mail: usa a forma canônica", async () => {
        const corpo = { senhaAtual: "x", novoEmail: DIGITADO };
        expect(await emailDepoisDe(validarSolicitarTrocaEmail, corpo)).toBe(CANONICO);
    });

    it("não mexe em endereços que não são do Gmail além de minúsculas", async () => {
        expect(await emailDepoisDe(validarCadastroCandidato, { ...CORPO_CADASTRO, email: "Maria.Silva@Empresa.com.br" })).toBe(
            "maria.silva@empresa.com.br"
        );
    });

    // Achado 2. O login deixa o e-mail como foi digitado, e o serviço só põe em minúsculas: o
    // texto procurado no banco (`maria.silva+acesso@gmail.com`) nunca é o que o cadastro gravou
    // (`mariasilva@gmail.com`). A etapa 2 do plano troca isso por uma regra única, e este teste
    // passa a ser um teste comum.
    it.fails("login: usa a mesma forma canônica do cadastro (achado 2)", async () => {
        expect(await emailDepoisDe(validarLogin, { email: DIGITADO, senha: "x" })).toBe(CANONICO);
    });
});
