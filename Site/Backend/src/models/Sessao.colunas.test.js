import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * O model `Sessao` só declara colunas de migrations posteriores quando o recurso delas está ligado. Sem isso,
 * subir o código antes de aplicar a migration (o deploy não a aplica) derrubaria TODO login, cadastro e
 * renovação com `column "..." of relation "sessoes" does not exist`, mesmo com o recurso desligado. Visto de
 * verdade num banco só até a migration 0007.
 */

async function carregar() {
    vi.resetModules();
    return (await import("./Sessao.js")).default;
}

beforeEach(() => {
    vi.unstubAllEnvs();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("Sessao: colunas condicionadas à chave do recurso", () => {
    it("as colunas da 0001 continuam sempre presentes", async () => {
        vi.stubEnv("SESSOES_DISPOSITIVOS_HABILITADO", "false");
        const Sessao = await carregar();

        for (const coluna of ["usuarioId", "tokenHash", "expiraEm", "revogadaEm", "substituidaPorId", "userAgent", "ip"]) {
            expect(Object.keys(Sessao.rawAttributes)).toContain(coluna);
        }
    });
});

describe("Sessao: colunas da migration 0009 (sessões e dispositivos)", () => {
    const COLUNAS = ["familiaId", "iniciadaEm", "ultimoUsoEm"];

    it("DESLIGADA (padrão): nenhuma delas entra nas consultas", async () => {
        vi.stubEnv("SESSOES_DISPOSITIVOS_HABILITADO", "false");
        const Sessao = await carregar();

        for (const coluna of COLUNAS) expect(Object.keys(Sessao.rawAttributes)).not.toContain(coluna);
    });

    it("LIGADA: passam a existir", async () => {
        vi.stubEnv("SESSOES_DISPOSITIVOS_HABILITADO", "true");
        const Sessao = await carregar();

        for (const coluna of COLUNAS) expect(Object.keys(Sessao.rawAttributes)).toContain(coluna);
    });
});
