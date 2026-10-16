import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";

/**
 * O código de entrega e a prova do Google: assinatura, validade, vínculo com o navegador e a
 * separação entre os dois (cada um com a sua `audience`). `jsonwebtoken` fica real.
 */

const SEGREDO = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

vi.mock("../config/env.js", () => ({
    default: { jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres", expiresIn: "30m" } }
}));

const {
    SEGUNDOS_CODIGO_DE_ENTREGA,
    SEGUNDOS_PROVA,
    assinarCodigoDeEntrega,
    assinarProva,
    conferirVinculo,
    hashDoVinculo,
    lerCodigoDeEntrega,
    lerProva,
    vinculoValido
} = await import("./codigoGoogle.js");
const { assinarJwt, verificarJwt } = await import("./jwt.js");

const PERFIL = { sub: "sub-1", email: "ana@exemplo.com", emailVerificado: true, nome: "Ana" };
const SEGREDO_DO_NAVEGADOR = "segredo-aleatorio-do-navegador-com-256-bits";
const VINCULO = hashDoVinculo(SEGREDO_DO_NAVEGADOR);

const statusDe = (fn) => {
    try {
        fn();
    } catch (erro) {
        return erro.statusCode;
    }
    return null;
};

describe("vínculo com o navegador", () => {
    it("o hash do segredo é um SHA-256 em base64url, sempre com 43 caracteres", () => {
        expect(VINCULO).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(vinculoValido(VINCULO)).toBe(true);
    });

    it("o hash é estável: o mesmo segredo dá sempre o mesmo hash, e segredos diferentes dão hashes diferentes", () => {
        expect(hashDoVinculo(SEGREDO_DO_NAVEGADOR)).toBe(VINCULO);
        expect(hashDoVinculo("outro-segredo")).not.toBe(VINCULO);
    });

    it("bate com o que o Site calcula: SHA-256 em base64url do segredo em UTF-8", () => {
        // Valor conhecido (calculado fora deste código) para o texto "abc".
        expect(hashDoVinculo("abc")).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
    });

    it.each([[undefined], [null], [""], ["curto"], [`${VINCULO}x`], ["a".repeat(43) + "="], [42]])(
        "não aceita %j como hash de vínculo",
        (valor) => {
            expect(vinculoValido(valor)).toBe(false);
        }
    );

    it("aceita o segredo certo", () => {
        expect(() => conferirVinculo(VINCULO, SEGREDO_DO_NAVEGADOR)).not.toThrow();
    });

    it.each([[undefined], [null], [""], ["segredo-de-outro-navegador"], [VINCULO]])(
        "recusa com 400 o segredo %j",
        (apresentado) => {
            expect(statusDe(() => conferirVinculo(VINCULO, apresentado))).toBe(400);
        }
    );

    it("recusa quando o código não tem hash gravado", () => {
        expect(statusDe(() => conferirVinculo(undefined, SEGREDO_DO_NAVEGADOR))).toBe(400);
    });
});

describe("código de entrega", () => {
    const assinar = () => assinarCodigoDeEntrega({ perfil: PERFIL, tipoConta: "empresa", vinculo: VINCULO });

    it("carrega o perfil, o tipoConta e o vínculo, e tem um identificador único", () => {
        const conteudo = lerCodigoDeEntrega(assinar());
        expect(conteudo).toMatchObject({ perfil: PERFIL, tipoConta: "empresa", vinculo: VINCULO });
        expect(conteudo.jti).toEqual(expect.any(String));
        expect(lerCodigoDeEntrega(assinar()).jti).not.toBe(conteudo.jti);
    });

    it("dura poucos minutos", () => {
        const { exp, iat } = lerCodigoDeEntrega(assinar());
        expect(exp - iat).toBe(SEGUNDOS_CODIGO_DE_ENTREGA);
        expect(SEGUNDOS_CODIGO_DE_ENTREGA).toBeLessThanOrEqual(5 * 60);
    });

    it("recusa código expirado", () => {
        const expirado = jwt.sign({ perfil: PERFIL, vinculo: VINCULO }, SEGREDO, {
            expiresIn: -5,
            audience: "acesso:google:entrega",
            jwtid: "x"
        });
        expect(statusDe(() => lerCodigoDeEntrega(expirado))).toBe(400);
    });

    it("recusa código sem vínculo, sem perfil ou sem identificador", () => {
        const base = { expiresIn: 60, audience: "acesso:google:entrega" };
        expect(statusDe(() => lerCodigoDeEntrega(jwt.sign({ perfil: PERFIL }, SEGREDO, { ...base, jwtid: "x" })))).toBe(400);
        expect(statusDe(() => lerCodigoDeEntrega(jwt.sign({ vinculo: VINCULO }, SEGREDO, { ...base, jwtid: "x" })))).toBe(400);
        expect(statusDe(() => lerCodigoDeEntrega(jwt.sign({ perfil: PERFIL, vinculo: VINCULO }, SEGREDO, base)))).toBe(400);
    });

    it("recusa código assinado por outro segredo", () => {
        const falso = jwt.sign({ perfil: PERFIL, vinculo: VINCULO }, "outro-segredo-qualquer-com-bastante-tamanho", {
            expiresIn: 60,
            audience: "acesso:google:entrega",
            jwtid: "x"
        });
        expect(statusDe(() => lerCodigoDeEntrega(falso))).toBe(400);
    });

    it("não aceita a prova no lugar do código de entrega", () => {
        expect(statusDe(() => lerCodigoDeEntrega(assinarProva(PERFIL)))).toBe(400);
    });

    it("não aceita um access token no lugar do código de entrega", () => {
        expect(statusDe(() => lerCodigoDeEntrega(assinarJwt({ id: "u1", tipoUsuario: "candidato" })))).toBe(400);
    });

    it("o código de entrega não serve como access token (falta o issuer)", () => {
        expect(() => verificarJwt(assinar())).toThrow();
    });
});

describe("prova do Google", () => {
    it("carrega o perfil verificado e dura o tempo de um cadastro", () => {
        const { perfil, exp, iat } = lerProva(assinarProva(PERFIL));
        expect(perfil).toEqual(PERFIL);
        expect(exp - iat).toBe(SEGUNDOS_PROVA);
    });

    it("não aceita o código de entrega no lugar da prova", () => {
        const codigo = assinarCodigoDeEntrega({ perfil: PERFIL, tipoConta: null, vinculo: VINCULO });
        expect(statusDe(() => lerProva(codigo))).toBe(400);
    });

    it("não aceita um access token no lugar da prova", () => {
        expect(statusDe(() => lerProva(assinarJwt({ id: "u1", tipoUsuario: "candidato" })))).toBe(400);
    });

    it("recusa prova expirada com a mensagem de entrar de novo", () => {
        const expirada = jwt.sign({ perfil: PERFIL }, SEGREDO, { expiresIn: -5, audience: "acesso:google:prova" });
        expect(() => lerProva(expirada)).toThrowError(expect.objectContaining({ statusCode: 400, message: expect.stringContaining("expirou") }));
    });

    it("recusa prova sem sub", () => {
        const semSub = jwt.sign({ perfil: { email: "a@b.com" } }, SEGREDO, { expiresIn: 60, audience: "acesso:google:prova" });
        expect(statusDe(() => lerProva(semSub))).toBe(400);
    });

    it("o access token não é aceito como prova nem a prova como access token", () => {
        expect(() => verificarJwt(assinarProva(PERFIL))).toThrow();
    });
});
