import { describe, it, expect } from "vitest";

import { emailCanonico } from "./email.js";
import { validarCadastroCandidato } from "../validators/autenticacaoValidator.js";

describe("emailCanonico", () => {
    it.each([
        ["Maria.Silva+acesso@Gmail.com", "mariasilva@gmail.com"],
        ["maria.silva@gmail.com", "mariasilva@gmail.com"],
        ["Maria.Silva@googlemail.com", "mariasilva@gmail.com"],
        ["maria.silva+x@outlook.com", "maria.silva@outlook.com"],
        ["Maria.Silva@Empresa.com.br", "maria.silva@empresa.com.br"],
        ["  ana@exemplo.com  ", "ana@exemplo.com"]
    ])("%j vira %j", (entrada, esperado) => {
        expect(emailCanonico(entrada)).toBe(esperado);
    });

    it("duas formas do mesmo endereço do Gmail dão o mesmo resultado", () => {
        expect(emailCanonico("a.b.c@gmail.com")).toBe(emailCanonico("abc+qualquer@gmail.com"));
    });

    it("é idempotente: aplicar de novo não muda nada", () => {
        const uma = emailCanonico("Maria.Silva+x@Gmail.com");
        expect(emailCanonico(uma)).toBe(uma);
    });

    it("devolve texto vazio para ausência de e-mail", () => {
        expect(emailCanonico(undefined)).toBe("");
        expect(emailCanonico(null)).toBe("");
        expect(emailCanonico("   ")).toBe("");
    });

    it("não perde o que não é e-mail: volta em minúsculas, para a comparação falhar de forma honesta", () => {
        expect(emailCanonico("Isto Não É E-mail")).toBe("isto não é e-mail");
    });

    it("dá exatamente o que o cadastro grava no banco (mesma regra do validador)", async () => {
        const req = {
            body: {
                nome: "Maria Silva",
                email: "Maria.Silva+acesso@Gmail.com",
                senha: "Senha@1234",
                telefone: "11999999999",
                cpf: "12345678901",
                pais: "br",
                dataNascimento: "1990-01-01",
                cidade: "São Paulo",
                estado: "sp"
            },
            headers: {},
            query: {},
            params: {},
            cookies: {}
        };
        const original = req.body.email;
        for (const cadeia of validarCadastroCandidato) await cadeia.run(req);

        expect(emailCanonico(original)).toBe(req.body.email);
    });
});
