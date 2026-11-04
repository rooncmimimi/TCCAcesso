import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validationResult } from "express-validator";

import { validarCriacaoCandidatura, validarRascunhoDaCandidatura, validarRespostaDeAdaptacao } from "../validators/candidaturaValidator.js";

/**
 * As rotas do Bloco 2 e quem as protege, lidas da tabela de rotas de verdade (sem servidor nem
 * banco), mais a migration e as regras de entrada. A autorização de cada rota vive no service;
 * aqui se confere que nenhuma delas ficou sem sessão e sem o papel certo.
 */

const { default: autenticacaoMiddleware } = await import("../middlewares/autenticacaoMiddleware.js");
const { default: minhaAcessibilidadeRoutes } = await import("./minhaAcessibilidadeRoutes.js");
const { default: candidaturaRoutes } = await import("./candidaturaRoutes.js");
const { default: vagaRoutes } = await import("./vagaRoutes.js");

/** Todas as camadas de um roteador, na ordem: as do `router.use` e as da rota. */
function camadas(roteador, metodo, caminho) {
    const gerais = roteador.stack.filter((c) => !c.route).map((c) => c.handle);
    const daRota = roteador.stack.find((c) => c.route?.path === caminho && c.route.methods[metodo])?.route.stack.map((c) => c.handle);

    return daRota ? [...gerais, ...daRota] : undefined;
}

/** Roda os validadores de um conjunto contra um corpo e devolve os campos com erro. */
async function erros(validadores, req) {
    const requisicao = { body: {}, params: {}, query: {}, headers: {}, ...req };
    for (const v of validadores) await v.run(requisicao);

    return validationResult(requisicao).array().map((e) => e.path);
}

const exigeSessao = (handlers) => handlers.includes(autenticacaoMiddleware);

describe("Minha Acessibilidade: tudo privado", () => {
    it.each([
        ["get", "/catalogo"],
        ["get", "/"],
        ["put", "/adaptacoes"],
        ["put", "/comunicacao"],
        ["put", "/privacidade"]
    ])("%s %s exige sessão", (metodo, caminho) => {
        const handlers = camadas(minhaAcessibilidadeRoutes, metodo, caminho);

        expect(handlers).toBeDefined();
        expect(exigeSessao(handlers)).toBe(true);
    });

    it("e o papel de candidato, em todas", () => {
        const handlers = camadas(minhaAcessibilidadeRoutes, "get", "/");

        expect(handlers.length).toBeGreaterThanOrEqual(3);
        // O segundo `use` é o RBAC; chamado com uma empresa, recusa.
        const rbac = handlers[1];
        let erro;
        rbac({ user: { tipoUsuario: "empresa" } }, {}, (e) => (erro = e));
        expect(erro?.statusCode ?? erro?.status).toBe(403);
    });

    it("nenhuma rota recebe id na URL: só existe a pessoa da sessão", () => {
        const caminhos = minhaAcessibilidadeRoutes.stack.filter((c) => c.route).map((c) => c.route.path);

        expect(caminhos.every((c) => !c.includes(":"))).toBe(true);
    });
});

describe("rascunho, prévia e adaptações da candidatura", () => {
    it.each([
        ["get", "/:vagaId/rascunho"],
        ["put", "/:vagaId/rascunho"],
        ["delete", "/:vagaId/rascunho"],
        ["post", "/:vagaId/candidaturas/previa"]
    ])("vagas: %s %s exige sessão e candidato", (metodo, caminho) => {
        const handlers = camadas(vagaRoutes, metodo, caminho);

        expect(handlers, caminho).toBeDefined();
        expect(exigeSessao(handlers)).toBe(true);
        expect(handlers.length).toBeGreaterThan(3);
    });

    it.each([
        ["get", "/rascunhos"],
        ["put", "/:id/adaptacoes"],
        ["delete", "/:id/adaptacoes"],
        ["post", "/:id/adaptacoes/resposta"]
    ])("candidaturas: %s %s exige sessão", (metodo, caminho) => {
        const handlers = camadas(candidaturaRoutes, metodo, caminho);

        expect(handlers, caminho).toBeDefined();
        expect(exigeSessao(handlers)).toBe(true);
    });

    it("a resposta da empresa só é aceita de uma empresa; editar e retirar, só de candidato", () => {
        // O RBAC é o fecho de exigirTipoUsuarioMiddleware: chama só ele (nunca controller nem validador).
        const aceita = (handlers, tipo) => {
            const rbac = handlers.find((h) => !h.builder && h.toString().includes("papeis"));
            let erro = null;
            rbac({ user: { tipoUsuario: tipo } }, {}, (e) => (erro = e ?? null));

            return erro === null;
        };

        const resposta = camadas(candidaturaRoutes, "post", "/:id/adaptacoes/resposta");
        const retirar = camadas(candidaturaRoutes, "delete", "/:id/adaptacoes");
        const editar = camadas(candidaturaRoutes, "put", "/:id/adaptacoes");

        expect(aceita(resposta, "empresa")).toBe(true);
        expect(aceita(resposta, "candidato")).toBe(false);
        expect(aceita(resposta, "administrador")).toBe(false);
        expect(aceita(retirar, "candidato")).toBe(true);
        expect(aceita(retirar, "empresa")).toBe(false);
        expect(aceita(editar, "candidato")).toBe(true);
        expect(aceita(editar, "empresa")).toBe(false);
    });

    it("/rascunhos vem ANTES de /:id, senão 'rascunhos' seria lido como identificador", () => {
        const caminhos = candidaturaRoutes.stack.filter((c) => c.route).map((c) => c.route.path);

        expect(caminhos.indexOf("/rascunhos")).toBeGreaterThanOrEqual(0);
        expect(caminhos.indexOf("/rascunhos")).toBeLessThan(caminhos.indexOf("/:id"));
    });
});

describe("regras de entrada", () => {
    const vagaId = "11111111-1111-4111-8111-111111111111";

    it("a candidatura aceita as escolhas e a confirmação no formato certo", async () => {
        expect(
            await erros(validarCriacaoCandidatura, {
                params: { vagaId },
                body: { mensagem: "Olá", compartilhar: { adaptacoes: ["legendas"], deficiencia: true, comunicacao: { canaisPreferidos: true } }, aceita: true }
            })
        ).toEqual([]);
    });

    it("recusa escolhas em formato errado (texto 'true', lista que não é lista, objeto que não é objeto)", async () => {
        const campos = await erros(validarCriacaoCandidatura, {
            params: { vagaId },
            body: { compartilhar: { adaptacoes: "legendas", deficiencia: "true", comunicacao: [1] }, aceita: "sim" }
        });

        expect(campos).toEqual(expect.arrayContaining(["compartilhar.adaptacoes", "compartilhar.deficiencia", "compartilhar.comunicacao", "aceita"]));
    });

    it("o rascunho recusa etapa inventada", async () => {
        expect(await erros(validarRascunhoDaCandidatura, { params: { vagaId }, body: { etapa: "enviar" } })).toContain("etapa");
    });

    it("a resposta da empresa só aceita as quatro respostas", async () => {
        const id = "22222222-2222-4222-8222-222222222222";

        expect(await erros(validarRespostaDeAdaptacao, { params: { id }, body: { resposta: "podemos_conversar" } })).toEqual([]);
        expect(await erros(validarRespostaDeAdaptacao, { params: { id }, body: { resposta: "talvez" } })).toContain("resposta");
    });
});

describe("migration 0012", () => {
    const sql = readFileSync(fileURLToPath(new URL("../../migrations/0012_adaptacoes_rascunhos_e_privacidade_da_candidatura.sql", import.meta.url)), "utf8");

    it("a categoria de deficiência nasce privada para todos", () => {
        expect(sql).toMatch(/exibir_deficiencia_no_perfil boolean NOT NULL DEFAULT false/);
    });

    it.each(["perfis_adaptacao", "preferencias_comunicacao", "candidatura_adaptacoes", "candidatura_rascunhos"])("%s é criada com RLS e sem acesso para anon/authenticated", (tabela) => {
        expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${tabela}`);
        expect(sql).toMatch(/'perfis_adaptacao', 'preferencias_comunicacao', 'candidatura_adaptacoes', 'candidatura_rascunhos'/);
        expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
        expect(sql).toMatch(/REVOKE ALL ON TABLE public\.%I FROM anon, authenticated/);
    });

    it("retirar a autorização é garantido pelo banco: retirada não tem conteúdo nem resposta", () => {
        expect(sql).toMatch(/estado = 'retirada' AND itens IS NULL AND retirado_em IS NOT NULL AND resposta IS NULL/);
    });

    it("um rascunho por candidato e vaga, e nada de rascunho dentro de candidaturas", () => {
        expect(sql).toMatch(/UNIQUE \(candidato_id, vaga_id\)/);
        expect(sql).not.toMatch(/ALTER TYPE .*status_candidatura/i);
        expect(sql).not.toMatch(/ALTER TABLE public\.candidaturas/i);
    });

    it("só acrescenta: não apaga nem altera dados existentes", () => {
        const semComentarios = sql.replace(/^--.*$/gm, "");

        expect(semComentarios).not.toMatch(/\bDROP TABLE\b/i);
        expect(semComentarios).not.toMatch(/\bDELETE FROM\b/i);
        expect(semComentarios).not.toMatch(/\bTRUNCATE\b/i);
        expect(semComentarios).not.toMatch(/\bUPDATE\s+public\./i);
    });

    it("traz no cabeçalho a ordem de implantação e como voltar atrás", () => {
        expect(sql).toMatch(/ORDEM DE IMPLANTAÇÃO/);
        expect(sql).toMatch(/COMO VOLTAR ATRÁS/);
    });
});
