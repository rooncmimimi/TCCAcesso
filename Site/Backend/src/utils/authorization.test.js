import { describe, it, expect } from "vitest";
import {
    ehAdministrador,
    garantirDono,
    garantirAlvoDeAcaoAdministrativa,
    garantirEmpresaAprovada,
    garantirVagaDisponivelParaCandidatura
} from "./authorization.js";

const usuario = (overrides = {}) => ({
    id: "user-1",
    tipoUsuario: "candidato",
    ...overrides
});

describe("ehAdministrador", () => {
    it("retorna true para tipoUsuario administrador", () => {
        expect(ehAdministrador(usuario({ tipoUsuario: "administrador" }))).toBe(true);
    });

    it("retorna false para outros tipos e para ausência de usuário", () => {
        expect(ehAdministrador(usuario({ tipoUsuario: "empresa" }))).toBe(false);
        expect(ehAdministrador(null)).toBe(false);
        expect(ehAdministrador(undefined)).toBe(false);
    });
});

describe("garantirDono", () => {
    it("não lança quando o solicitante é o dono do recurso", () => {
        expect(() => garantirDono(usuario({ id: "dono-1" }), "dono-1")).not.toThrow();
    });

    it("não lança quando o solicitante é administrador, mesmo sem ser o dono", () => {
        const admin = usuario({ id: "admin-1", tipoUsuario: "administrador" });
        expect(() => garantirDono(admin, "outro-usuario")).not.toThrow();
    });

    it("lança 403 com a mensagem padrão quando não é dono nem admin", () => {
        const intruso = usuario({ id: "intruso-1" });
        try {
            garantirDono(intruso, "dono-1");
            expect.unreachable("deveria ter lançado");
        } catch (erro) {
            expect(erro.statusCode).toBe(403);
            expect(erro.message).toBe("Você não possui permissão sobre este recurso.");
        }
    });

    it("usa a mensagem customizada quando fornecida", () => {
        const intruso = usuario({ id: "intruso-1" });
        try {
            garantirDono(intruso, "dono-1", "Você só pode cancelar as suas próprias candidaturas.");
            expect.unreachable("deveria ter lançado");
        } catch (erro) {
            expect(erro.message).toBe("Você só pode cancelar as suas próprias candidaturas.");
        }
    });
});

describe("garantirAlvoDeAcaoAdministrativa", () => {
    const mensagens = {
        mensagemAutoAcao: "Você não pode agir contra a própria conta.",
        mensagemAdminProtegido: "Contas administrativas não podem ser alvo desta ação."
    };

    it("não lança para um alvo comum, diferente do solicitante", () => {
        const alvo = usuario({ id: "alvo-1" });
        const solicitante = usuario({ id: "admin-1", tipoUsuario: "administrador" });
        expect(() => garantirAlvoDeAcaoAdministrativa(alvo, solicitante, mensagens)).not.toThrow();
    });

    it("lança 400 quando o alvo é o próprio solicitante", () => {
        const solicitante = usuario({ id: "admin-1", tipoUsuario: "administrador" });
        try {
            garantirAlvoDeAcaoAdministrativa(solicitante, solicitante, mensagens);
            expect.unreachable("deveria ter lançado");
        } catch (erro) {
            expect(erro.statusCode).toBe(400);
            expect(erro.message).toBe(mensagens.mensagemAutoAcao);
        }
    });

    it("lança 403 quando o alvo é uma conta administrativa", () => {
        const alvoAdmin = usuario({ id: "outro-admin", tipoUsuario: "administrador" });
        const solicitante = usuario({ id: "admin-1", tipoUsuario: "administrador" });
        try {
            garantirAlvoDeAcaoAdministrativa(alvoAdmin, solicitante, mensagens);
            expect.unreachable("deveria ter lançado");
        } catch (erro) {
            expect(erro.statusCode).toBe(403);
            expect(erro.message).toBe(mensagens.mensagemAdminProtegido);
        }
    });
});

describe("garantirEmpresaAprovada", () => {
    it("não lança quando o solicitante é administrador, independente do status", () => {
        const admin = usuario({ tipoUsuario: "administrador" });
        expect(() =>
            garantirEmpresaAprovada({ statusAprovacao: "pendente" }, admin)
        ).not.toThrow();
    });

    it("não lança quando a empresa está aprovada", () => {
        expect(() =>
            garantirEmpresaAprovada({ statusAprovacao: "aprovada" }, usuario({ tipoUsuario: "empresa" }))
        ).not.toThrow();
    });

    it("lança 403 com o motivo da suspensão quando informado", () => {
        const empresa = { statusAprovacao: "suspensa", motivoSuspensao: "Denúncias recorrentes" };
        try {
            garantirEmpresaAprovada(empresa, usuario({ tipoUsuario: "empresa" }));
            expect.unreachable("deveria ter lançado");
        } catch (erro) {
            expect(erro.statusCode).toBe(403);
            expect(erro.message).toContain("Denúncias recorrentes");
        }
    });

    it("lança 403 genérico para pendente, sem revelar detalhe de moderação", () => {
        try {
            garantirEmpresaAprovada({ statusAprovacao: "pendente" }, usuario({ tipoUsuario: "empresa" }));
            expect.unreachable("deveria ter lançado");
        } catch (erro) {
            expect(erro.statusCode).toBe(403);
            expect(erro.message).toMatch(/aguardando aprovação/i);
        }
    });
});

describe("garantirVagaDisponivelParaCandidatura", () => {
    it("não lança quando a empresa dona da vaga está aprovada", () => {
        expect(() =>
            garantirVagaDisponivelParaCandidatura({ statusAprovacao: "aprovada" })
        ).not.toThrow();
    });

    it("lança 403 genérico (sem motivo) para qualquer status diferente de aprovada", () => {
        try {
            garantirVagaDisponivelParaCandidatura({ statusAprovacao: "suspensa", motivoSuspensao: "interno" });
            expect.unreachable("deveria ter lançado");
        } catch (erro) {
            expect(erro.statusCode).toBe(403);
            expect(erro.message).not.toContain("interno");
        }
    });
});
