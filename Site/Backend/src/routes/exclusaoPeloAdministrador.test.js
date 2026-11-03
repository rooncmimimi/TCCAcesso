import { describe, it, expect } from "vitest";

/**
 * O administrador não exclui perfil nem conta: não basta esconder o botão, a rota não pode existir.
 *
 * O teste lê a tabela de rotas dos roteadores de verdade (sem subir servidor nem banco) e confere que
 * nenhuma delas aceita `DELETE` num recurso de conta, perfil de candidato ou empresa. E, do outro lado,
 * que o que deve continuar existe: a pessoa excluir a **própria** conta (`DELETE /auth/conta`), o
 * bloqueio de contas e as ações de moderação sobre conteúdo.
 */

const { default: adminRoutes } = await import("./adminRoutes.js");
const { default: usuarioRoutes } = await import("./usuarioRoutes.js");
const { default: candidatoRoutes } = await import("./candidatoRoutes.js");
const { default: empresaRoutes } = await import("./empresaRoutes.js");
const { default: autenticacaoRoutes } = await import("./autenticacaoRoutes.js");

/** "METODO /caminho" de cada rota registrada no roteador. */
function rotasDe(roteador) {
    const rotas = [];

    for (const camada of roteador.stack) {
        if (!camada.route) continue;

        for (const metodo of Object.keys(camada.route.methods)) {
            rotas.push(`${metodo.toUpperCase()} ${camada.route.path}`);
        }
    }

    return rotas;
}

describe("o administrador não tem rota para excluir conta ou perfil", () => {
    it.each([
        ["/admin", adminRoutes, ["DELETE /usuarios/:id"]],
        ["/usuarios", usuarioRoutes, ["DELETE /:id"]],
        ["/candidatos", candidatoRoutes, ["DELETE /:id"]],
        ["/empresas", empresaRoutes, ["DELETE /:id"]]
    ])("%s não aceita as rotas de exclusão que existiam", (_prefixo, roteador, proibidas) => {
        const rotas = rotasDe(roteador);

        for (const proibida of proibidas) {
            expect(rotas).not.toContain(proibida);
        }
    });

    it("nenhum roteador de conta ou perfil aceita DELETE direto no recurso", () => {
        const comDeleteNoRecurso = [adminRoutes, usuarioRoutes, candidatoRoutes, empresaRoutes]
            .flatMap(rotasDe)
            .filter((rota) => /^DELETE \/(:id|:usuarioId|usuarios\/:id)$/.test(rota));

        expect(comDeleteNoRecurso).toEqual([]);
    });
});

describe("o que continua existindo", () => {
    it("a própria pessoa continua podendo excluir a sua conta", () => {
        expect(rotasDe(autenticacaoRoutes)).toContain("DELETE /conta");
    });

    it("o administrador continua gerenciando contas sem excluí-las: listar, ver e bloquear", () => {
        const rotas = rotasDe(adminRoutes);

        expect(rotas).toContain("GET /usuarios");
        expect(rotas).toContain("GET /usuarios/:id");
        expect(rotas).toContain("POST /usuarios/:id/bloquear");
    });

    it("a moderação de conteúdo e de denúncias segue de pé", () => {
        const rotas = rotasDe(adminRoutes);

        for (const rota of [
            "DELETE /postagens/:id",
            "DELETE /comentarios/:id",
            "GET /denuncias",
            "GET /denuncias/:id",
            "PATCH /denuncias/:id/atribuir",
            "PATCH /denuncias/:id/resolver",
            "PATCH /denuncias/:id/rejeitar",
            "PATCH /denuncias/:id/arquivar"
        ]) {
            expect(rotas, rota).toContain(rota);
        }
    });

    it("excluir um item do próprio perfil (experiência, formação, deficiência vinculada) continua com a pessoa", () => {
        expect(rotasDe(candidatoRoutes)).toContain("DELETE /:id/deficiencias/:deficienciaId");
    });
});
