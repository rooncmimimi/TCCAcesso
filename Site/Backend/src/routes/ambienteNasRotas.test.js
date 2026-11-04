import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { validarAtualizacaoVaga } from "../validators/vagaValidator.js";
import { validationResult } from "express-validator";

/** Rotas do Bloco 3 e quem as protege (lidas da tabela de rotas, sem servidor nem banco), mais a migration 0013. */

const { default: autenticacaoMiddleware } = await import("../middlewares/autenticacaoMiddleware.js");
const { default: vagaRoutes } = await import("./vagaRoutes.js");
const { default: adminRoutes } = await import("./adminRoutes.js");
const { MIME_LEGENDAS, conferirConteudoDoArquivo, uploadLegenda } = await import("../middlewares/uploadMiddleware.js");

function camadas(roteador, metodo, caminho) {
    const gerais = roteador.stack.filter((c) => !c.route).map((c) => c.handle);
    const daRota = roteador.stack.find((c) => c.route?.path === caminho && c.route.methods[metodo])?.route.stack.map((c) => c.handle);

    return daRota ? [...gerais, ...daRota] : undefined;
}

const aceita = (handlers, tipo) => {
    const rbac = handlers.find((h) => !h.builder && h.toString().includes("papeis"));
    let erro = null;
    rbac({ user: { tipoUsuario: tipo } }, {}, (e) => (erro = e ?? null));

    return erro === null;
};

describe("rotas públicas", () => {
    it("o catálogo e a leitura do vídeo não exigem sessão (a vaga é pública)", () => {
        expect(camadas(vagaRoutes, "get", "/catalogo-acessibilidade")).not.toContain(autenticacaoMiddleware);
        expect(camadas(vagaRoutes, "get", "/:id/midia")).not.toContain(autenticacaoMiddleware);
    });

    it("/catalogo-acessibilidade vem ANTES de /:id, senão seria lido como identificador", () => {
        const caminhos = vagaRoutes.stack.filter((c) => c.route).map((c) => c.route.path);

        expect(caminhos.indexOf("/catalogo-acessibilidade")).toBeGreaterThanOrEqual(0);
        expect(caminhos.indexOf("/catalogo-acessibilidade")).toBeLessThan(caminhos.indexOf("/:id"));
    });
});

describe("gestão do vídeo: só empresa", () => {
    it.each([
        ["put", "/:id/midia/video"],
        ["put", "/:id/midia/legenda"],
        ["delete", "/:id/midia/legenda"],
        ["patch", "/:id/midia"],
        ["delete", "/:id/midia"]
    ])("%s %s exige sessão e papel de empresa", (metodo, caminho) => {
        const handlers = camadas(vagaRoutes, metodo, caminho);

        expect(handlers, caminho).toBeDefined();
        expect(handlers).toContain(autenticacaoMiddleware);
        expect(aceita(handlers, "empresa")).toBe(true);
        expect(aceita(handlers, "candidato")).toBe(false);
        expect(aceita(handlers, "administrador")).toBe(false);
    });

    it("o envio do vídeo passa por sessão, papel, validação, upload, armazenamento privado e só então o controller", () => {
        expect(camadas(vagaRoutes, "put", "/:id/midia/video").length).toBeGreaterThanOrEqual(6);
    });
});

describe("verificação do mapa físico: só moderação", () => {
    it("a rota é do administrador, inclusive pelo router.use do painel", () => {
        const handlers = camadas(adminRoutes, "post", "/vagas/:id/acessibilidade-fisica/verificacao");

        expect(handlers).toBeDefined();
        expect(handlers).toContain(autenticacaoMiddleware);
        expect(aceita(handlers, "administrador")).toBe(true);
        expect(aceita(handlers, "empresa")).toBe(false);
        expect(aceita(handlers, "candidato")).toBe(false);
    });
});

describe("WebVTT: a assinatura do arquivo é conferida, não só o tipo declarado", () => {
    const conferir = (texto, mimetype = "text/vtt") =>
        new Promise((resolve) => {
            const buffer = Buffer.from(texto, "utf8");
            conferirConteudoDoArquivo()({ file: { buffer, mimetype, size: buffer.length } }, {}, (erro) => resolve(erro ?? null));
        });

    it("é um tipo próprio, só em memória", () => {
        expect(MIME_LEGENDAS).toEqual({ "text/vtt": ".vtt" });
        expect(typeof uploadLegenda.single).toBe("function");
    });

    it("aceita um arquivo que começa com WEBVTT (com ou sem BOM)", async () => {
        expect(await conferir("WEBVTT\n\n00:00.000 --> 00:01.000\nOi")).toBeNull();
        expect(await conferir("﻿WEBVTT\n\n00:00.000 --> 00:01.000\nOi")).toBeNull();
    });

    it("recusa SRT, texto qualquer e um executável com o tipo trocado", async () => {
        expect(await conferir("1\n00:00:01,000 --> 00:00:02,000\nSRT")).not.toBeNull();
        expect(await conferir("qualquer texto de mais de oito caracteres")).not.toBeNull();
        expect(await conferir("MZ\u0090 programa executavel de verdade")).not.toBeNull();
    });

    it("recusa uma legenda acima do limite de 256 KB", async () => {
        expect(await conferir(`WEBVTT\n\n${"a".repeat(256 * 1024)}`)).not.toBeNull();
    });
});

describe("validação de entrada da vaga", () => {
    async function erros(body) {
        const req = { body: { titulo: "Analista", descricao: "Descrição com mais de vinte caracteres.", ...body }, params: { id: "11111111-1111-4111-8111-111111111111" }, query: {}, headers: {} };
        for (const v of validarAtualizacaoVaga) await v.run(req);

        return validationResult(req).array().map((e) => e.path);
    }

    it("aceita os campos novos no formato certo", async () => {
        expect(await erros({ atividades: "Atender", requisitosDesejaveis: "Inglês", etapasSelecao: "Entrevista", entrevistaAdaptacoes: ["legendas"], ambienteSensorial: { ruido: "silencioso" }, acessibilidadeFisica: { rampa: { situacao: "sim" } } })).toEqual([]);
    });

    it("recusa formatos errados (lista que não é lista, objeto que não é objeto)", async () => {
        const campos = await erros({ entrevistaAdaptacoes: "legendas", ambienteSensorial: ["x"], acessibilidadeFisica: "sim" });

        expect(campos).toEqual(expect.arrayContaining(["entrevistaAdaptacoes", "ambienteSensorial", "acessibilidadeFisica"]));
    });
});

describe("migration 0013", () => {
    const sql = readFileSync(fileURLToPath(new URL("../../migrations/0013_ambiente_entrevista_e_midia_da_vaga.sql", import.meta.url)), "utf8");
    const semComentarios = sql.replace(/^--.*$/gm, "");

    it("só acrescenta: nada de DROP, DELETE, TRUNCATE nem UPDATE de dados", () => {
        expect(semComentarios).not.toMatch(/\bDROP TABLE\b/i);
        expect(semComentarios).not.toMatch(/\bDROP COLUMN\b/i);
        expect(semComentarios).not.toMatch(/\bDELETE FROM\b/i);
        expect(semComentarios).not.toMatch(/\bTRUNCATE\b/i);
        expect(semComentarios).not.toMatch(/\bUPDATE\s+public\./i);
    });

    it("todas as colunas novas de vagas são opcionais ou têm padrão vazio", () => {
        for (const coluna of ["entrevista_adaptacoes", "ambiente_sensorial", "acessibilidade_fisica"]) {
            expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${coluna} .*DEFAULT`));
        }
        for (const coluna of ["entrevista_observacao", "atividades", "requisitos_desejaveis", "etapas_selecao"]) {
            expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${coluna} (text|varchar\\(500\\))(,|;)`));
        }
    });

    it("vaga_midias: um vídeo por vaga, transcrição obrigatória com mínimo, RLS e sem acesso para anon/authenticated", () => {
        expect(sql).toMatch(/UNIQUE \(vaga_id, tipo\)/);
        expect(sql).toMatch(/transcricao\s+text NOT NULL/);
        expect(sql).toMatch(/char_length\(btrim\(transcricao\)\) >= 20/);
        expect(sql).toMatch(/ON DELETE CASCADE/);
        expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
        expect(sql).toMatch(/REVOKE ALL ON TABLE public\.vaga_midias FROM anon, authenticated/);
    });

    it("a legenda é WebVTT de até 256 KB, conferida também pelo banco", () => {
        expect(sql).toMatch(/legenda_vtt LIKE 'WEBVTT%'/);
        expect(sql).toMatch(/262144/);
    });

    it("traz no cabeçalho a ordem de implantação e como voltar atrás", () => {
        expect(sql).toMatch(/ORDEM DE IMPLANTAÇÃO/);
        expect(sql).toMatch(/COMO VOLTAR ATRÁS/);
    });
});
