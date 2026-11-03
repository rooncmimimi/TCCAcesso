import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A exigência do TOTP para administrador tem de valer em TODA rota protegida, e não ser uma lista que
 * alguém esquece de atualizar. Este teste lê a tabela de rotas dos roteadores de verdade (sem subir
 * servidor nem banco) e confere:
 *
 * - todo o `/admin` passa pelo middleware padrão (que recusa administrador sem TOTP verificado);
 * - o middleware que deixa passar o administrador sem TOTP (`autenticacaoSemExigirMfa`) aparece só nas
 *   cinco rotas de que a tela de configuração precisa, e em nenhum outro arquivo;
 * - as rotas sensíveis do próprio TOTP usam o middleware padrão.
 */

const { default: autenticacaoMiddleware, autenticacaoSemExigirMfa } = await import("../middlewares/autenticacaoMiddleware.js");
const { default: adminRoutes } = await import("./adminRoutes.js");
const { default: autenticacaoRoutes } = await import("./autenticacaoRoutes.js");

function rotasComMiddleware(roteador, middleware) {
    const rotas = [];

    for (const camada of roteador.stack) {
        if (!camada.route) continue;

        if (camada.route.stack.some((c) => c.handle === middleware)) {
            for (const metodo of Object.keys(camada.route.methods)) {
                rotas.push(`${metodo.toUpperCase()} ${camada.route.path}`);
            }
        }
    }

    return rotas.sort();
}

describe("o /admin inteiro exige o TOTP verificado", () => {
    it("o roteador aplica o middleware padrão antes de qualquer rota", () => {
        const primeira = adminRoutes.stack[0];

        expect(primeira.route).toBeUndefined();
        expect(primeira.handle).toBe(autenticacaoMiddleware);
    });

    it("e nenhuma rota do /admin usa o middleware que dispensa o TOTP", () => {
        expect(rotasComMiddleware(adminRoutes, autenticacaoSemExigirMfa)).toEqual([]);
    });

    it("existe a rota de reiniciar o TOTP de outra conta, dentro do /admin", () => {
        const rotas = adminRoutes.stack.filter((c) => c.route).map((c) => `${Object.keys(c.route.methods)[0].toUpperCase()} ${c.route.path}`);

        expect(rotas).toContain("POST /usuarios/:id/totp/reiniciar");
    });
});

describe("autenticacaoSemExigirMfa só aparece onde a configuração precisa", () => {
    it("exatamente nestas rotas de /auth", () => {
        expect(rotasComMiddleware(autenticacaoRoutes, autenticacaoSemExigirMfa)).toEqual(
            ["GET /me", "GET /totp", "POST /logout", "POST /totp/ativar", "POST /totp/configurar"].sort()
        );
    });

    it("nenhum outro arquivo de rota o importa", () => {
        const pasta = resolve(__dirname);
        const usam = readdirSync(pasta)
            .filter((nome) => nome.endsWith("Routes.js"))
            .filter((nome) => readFileSync(resolve(pasta, nome), "utf8").includes("autenticacaoSemExigirMfa"));

        expect(usam).toEqual(["autenticacaoRoutes.js"]);
    });

    it("nem controllers, services ou outros middlewares", () => {
        const src = resolve(__dirname, "..");
        const achados = [];

        for (const pasta of ["controllers", "services", "middlewares", "utils", "realtime"]) {
            for (const nome of readdirSync(resolve(src, pasta))) {
                if (!nome.endsWith(".js") || nome.includes(".test.")) continue;
                if (readFileSync(resolve(src, pasta, nome), "utf8").includes("autenticacaoSemExigirMfa")) achados.push(`${pasta}/${nome}`);
            }
        }

        expect(achados).toEqual(["middlewares/autenticacaoMiddleware.js"]);
    });
});

describe("as ações sensíveis do TOTP exigem a sessão verificada", () => {
    it.each(["POST /totp/desativar", "POST /totp/codigos-recuperacao"])("%s usa o middleware padrão", (rota) => {
        expect(rotasComMiddleware(autenticacaoRoutes, autenticacaoMiddleware)).toContain(rota);
    });

    it("o segundo passo do login é público (quem identifica a conta é o desafio) e não usa nenhum dos dois", () => {
        expect(rotasComMiddleware(autenticacaoRoutes, autenticacaoMiddleware)).not.toContain("POST /login/totp");
        expect(rotasComMiddleware(autenticacaoRoutes, autenticacaoSemExigirMfa)).not.toContain("POST /login/totp");
    });
});
