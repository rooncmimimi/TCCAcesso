import { describe, it, expect, vi, beforeEach } from "vitest";
import { Op } from "sequelize";

/**
 * Sessões e dispositivos: o que o `SessaoService` decide sobre famílias de sessão (um login = um dispositivo), o
 * teto por conta, o encerramento e a limpeza. O banco é simulado; a semântica real (renovação atômica, trancamento,
 * migration 0009) é conferida na rodada funcional contra um Postgres descartável.
 */

const { env, sessaoModel } = vi.hoisted(() => ({
    env: { sessoes: { dispositivosHabilitado: true, maximoPorConta: 3 }, mfa: {} },
    sessaoModel: { create: vi.fn(), findAll: vi.fn(), findOne: vi.fn(), update: vi.fn(), destroy: vi.fn() }
}));

vi.mock("../config/env.js", () => ({ default: env }));
vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn() } }));
vi.mock("../models/index.js", () => ({ Sessao: sessaoModel, Usuario: { findByPk: vi.fn() } }));

const { default: SessaoService } = await import("./SessaoService.js");
const { hashToken } = await import("../utils/tokens.js");

const linha = (extra = {}) => ({
    id: "r1",
    usuarioId: "u1",
    tokenHash: "h1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120",
    ip: "1.1.1.1",
    criadoEm: new Date("2026-11-03T10:00:00Z"),
    expiraEm: new Date("2026-12-03T10:00:00Z"),
    familiaId: "f1",
    iniciadaEm: new Date("2026-11-01T08:00:00Z"),
    ultimoUsoEm: new Date("2026-11-03T10:00:00Z"),
    mfaVerificadoEm: null,
    update: vi.fn(),
    ...extra
});

beforeEach(() => {
    vi.clearAllMocks();
    env.sessoes.dispositivosHabilitado = true;
    env.sessoes.maximoPorConta = 3;
    sessaoModel.create.mockImplementation(async (dados) => ({ ...dados }));
    sessaoModel.findAll.mockResolvedValue([]);
    sessaoModel.update.mockResolvedValue([1]);
});

describe("emitir", () => {
    it("um login novo cria a família (o próprio id), o início e o último uso", async () => {
        const { registro, refreshToken } = await SessaoService.emitir("u1", { ip: "1.1.1.1", userAgent: "ua" });

        expect(registro.familiaId).toBe(registro.id);
        expect(registro.iniciadaEm).toBeInstanceOf(Date);
        expect(registro.ultimoUsoEm).toBeInstanceOf(Date);
        expect(registro.tokenHash).toBe(hashToken(refreshToken));
    });

    it("a renovação herda a família e o início, e só atualiza o último uso", async () => {
        const inicio = new Date("2026-11-01T08:00:00Z");

        const { registro } = await SessaoService.emitir("u1", {}, { rotacao: true, familia: { familiaId: "f1", iniciadaEm: inicio } });

        expect(registro.familiaId).toBe("f1");
        expect(registro.iniciadaEm).toBe(inicio);
        expect(registro.id).not.toBe("f1");
        expect(registro.ultimoUsoEm.getTime()).toBeGreaterThan(inicio.getTime());
    });

    it("SEM a chave ligada, nenhuma coluna da migration 0009 vai no insert", async () => {
        env.sessoes.dispositivosHabilitado = false;

        const { registro } = await SessaoService.emitir("u1", {});

        for (const coluna of ["familiaId", "iniciadaEm", "ultimoUsoEm"]) {
            expect(registro).not.toHaveProperty(coluna);
        }
    });

    it("a renovação não gasta uma consulta com o teto; o login novo gasta", async () => {
        await SessaoService.emitir("u1", {}, { rotacao: true });
        expect(sessaoModel.findAll).not.toHaveBeenCalled();

        await SessaoService.emitir("u1", {});
        expect(sessaoModel.findAll).toHaveBeenCalledTimes(1);
    });
});

describe("familiaDe", () => {
    it("devolve a família só com a chave ligada e em linha que a tem", () => {
        expect(SessaoService.familiaDe(linha())).toEqual({ familiaId: "f1", iniciadaEm: expect.any(Date) });
        expect(SessaoService.familiaDe(linha({ familiaId: null }))).toBeNull();

        env.sessoes.dispositivosHabilitado = false;
        expect(SessaoService.familiaDe(linha())).toBeNull();
    });
});

describe("teto de sessões por conta", () => {
    it("acima do teto, encerra as mais antigas e preserva as mais recentes", async () => {
        sessaoModel.findAll.mockResolvedValue([{ id: "n1" }, { id: "n2" }, { id: "n3" }, { id: "v1" }, { id: "v2" }]);

        const encerradas = await SessaoService.aplicarLimite("u1");

        expect(encerradas).toBe(2);
        const [valores, opcoes] = sessaoModel.update.mock.calls[0];
        expect(valores.revogadaEm).toBeInstanceOf(Date);
        expect(opcoes.where.usuarioId).toBe("u1");
        expect(opcoes.where[Op.or]).toEqual([{ id: { [Op.in]: ["v1", "v2"] } }]);
    });

    it("conta DISPOSITIVOS, não linhas: duas linhas ativas da mesma família (duas abas renovando) valem um dispositivo só", async () => {
        // 3 dispositivos (f1, f2, f3), mas f2 tem duas linhas ativas: 4 linhas. Com teto 3, NINGUÉM é encerrado.
        sessaoModel.findAll.mockResolvedValue([
            { id: "a", familiaId: "f1" },
            { id: "b1", familiaId: "f2" },
            { id: "b2", familiaId: "f2" },
            { id: "c", familiaId: "f3" }
        ]);

        expect(await SessaoService.aplicarLimite("u1")).toBe(0);
        expect(sessaoModel.update).not.toHaveBeenCalled();
    });

    it("ao exceder, encerra a FAMÍLIA inteira do dispositivo menos recente (todas as linhas dele)", async () => {
        sessaoModel.findAll.mockResolvedValue([
            { id: "d", familiaId: "f4" },
            { id: "c", familiaId: "f3" },
            { id: "b", familiaId: "f2" },
            { id: "a", familiaId: "f1" }
        ]);

        expect(await SessaoService.aplicarLimite("u1")).toBe(1);
        expect(sessaoModel.update.mock.calls[0][1].where[Op.or]).toEqual([{ familiaId: { [Op.in]: ["f1"] } }]);
    });

    it("dentro do teto, não encerra nada", async () => {
        sessaoModel.findAll.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);

        expect(await SessaoService.aplicarLimite("u1")).toBe(0);
        expect(sessaoModel.update).not.toHaveBeenCalled();
    });

    it("só conta as sessões ativas da própria conta", async () => {
        await SessaoService.aplicarLimite("u1");

        const { where } = sessaoModel.findAll.mock.calls[0][0];
        expect(where).toMatchObject({ usuarioId: "u1", revogadaEm: null });
        expect(where.expiraEm[Op.gt]).toBeInstanceOf(Date);
    });
});

describe("listarAtivas", () => {
    it("uma entrada por login, mesmo se a família tem duas linhas na janela de tolerância", async () => {
        sessaoModel.findAll.mockResolvedValue([linha({ id: "nova" }), linha({ id: "velha" }), linha({ id: "outro", familiaId: "f2" })]);

        const lista = await SessaoService.listarAtivas("u1");

        expect(lista.map((s) => s.id)).toEqual(["nova", "outro"]);
    });

    it("marca a atual pela família do access token", async () => {
        sessaoModel.findAll.mockResolvedValue([linha({ id: "a", familiaId: "f1" }), linha({ id: "b", familiaId: "f2" })]);

        const lista = await SessaoService.listarAtivas("u1", { familiaId: "f2" });

        expect(lista.map((s) => s.atual)).toEqual([false, true]);
    });

    it("ou pelo refresh token informado, quando não há família", async () => {
        sessaoModel.findAll.mockResolvedValue([linha({ id: "a", tokenHash: hashToken("meu-refresh"), familiaId: null }), linha({ id: "b", tokenHash: "x", familiaId: null })]);

        const lista = await SessaoService.listarAtivas("u1", { tokenAtual: "meu-refresh" });

        expect(lista.map((s) => s.atual)).toEqual([true, false]);
    });

    it("sem identificar a atual, nenhuma vem marcada", async () => {
        sessaoModel.findAll.mockResolvedValue([linha()]);

        expect((await SessaoService.listarAtivas("u1"))[0].atual).toBe(false);
    });

    it("as datas são as verdadeiras (início e último uso); sem a migration, caem no criadoEm", async () => {
        sessaoModel.findAll.mockResolvedValue([linha(), linha({ id: "antiga", familiaId: undefined, iniciadaEm: undefined, ultimoUsoEm: undefined })]);

        const [nova, antiga] = await SessaoService.listarAtivas("u1");

        expect(nova.iniciadaEm).toEqual(new Date("2026-11-01T08:00:00Z"));
        expect(antiga.iniciadaEm).toEqual(antiga.criadoEm);
        expect(antiga.ultimoUsoEm).toEqual(antiga.criadoEm);
    });

    it("diz se a sessão passou pelo segundo fator e nunca devolve o hash do token", async () => {
        sessaoModel.findAll.mockResolvedValue([linha({ mfaVerificadoEm: new Date() })]);

        const [sessao] = await SessaoService.listarAtivas("u1");

        expect(sessao.verificadaEmDuasEtapas).toBe(true);
        expect(JSON.stringify(sessao)).not.toContain("tokenHash");
        expect(JSON.stringify(sessao)).not.toContain("h1");
    });
});

describe("revogarPorId", () => {
  it("com família, encerra o login inteiro (todas as renovações) e só da própria conta", async () => {
        sessaoModel.findOne.mockResolvedValue(linha());

        await SessaoService.revogarPorId("u1", "r1");

        const [valores, opcoes] = sessaoModel.update.mock.calls[0];
        expect(valores.revogadaEm).toBeInstanceOf(Date);
        expect(opcoes.where).toEqual({ familiaId: "f1", usuarioId: "u1", revogadaEm: null });
    });

    it("sem família (linha antiga), revoga só a linha", async () => {
        const registro = linha({ familiaId: null });
        sessaoModel.findOne.mockResolvedValue(registro);

        await SessaoService.revogarPorId("u1", "r1");

        expect(registro.update).toHaveBeenCalledWith({ revogadaEm: expect.any(Date) });
        expect(sessaoModel.update).not.toHaveBeenCalled();
    });

    it("sessão de outra conta (ou inexistente): 404, e nada é revogado", async () => {
        sessaoModel.findOne.mockResolvedValue(null);

        await expect(SessaoService.revogarPorId("u1", "de-outra-pessoa")).rejects.toMatchObject({ statusCode: 404 });
        expect(sessaoModel.findOne.mock.calls[0][0].where).toMatchObject({ id: "de-outra-pessoa", usuarioId: "u1" });
        expect(sessaoModel.update).not.toHaveBeenCalled();
    });
});

describe("revogarTodosExceto: nunca encerra a sessão de quem pediu", () => {
    it("sem conseguir identificar a atual, recusa e NÃO revoga nada (antes revogava todas, inclusive a atual)", async () => {
        await expect(SessaoService.revogarTodosExceto("u1", {})).rejects.toMatchObject({
            statusCode: 400,
            detalhes: { codigo: "SESSAO_ATUAL_NAO_IDENTIFICADA" }
        });
        expect(sessaoModel.update).not.toHaveBeenCalled();
    });

    it("refresh token que não é de uma sessão ativa desta conta também é recusado", async () => {
        sessaoModel.findOne.mockResolvedValue(null);

        await expect(SessaoService.revogarTodosExceto("u1", { tokenAtual: "inventado" })).rejects.toMatchObject({ statusCode: 400 });
        expect(sessaoModel.update).not.toHaveBeenCalled();
    });

    it("pela família do access token: revoga as outras famílias e as linhas sem família", async () => {
        await SessaoService.revogarTodosExceto("u1", { familiaId: "f1" });

        const { where } = sessaoModel.update.mock.calls[0][1];
        expect(where).toMatchObject({ usuarioId: "u1", revogadaEm: null });
        expect(where[Op.or]).toEqual([{ familiaId: { [Op.ne]: "f1" } }, { familiaId: null }]);
    });

    it("pelo refresh token: poupa a linha dele", async () => {
        sessaoModel.findOne.mockResolvedValue(linha({ id: "atual", familiaId: null }));

        await SessaoService.revogarTodosExceto("u1", { tokenAtual: "meu-refresh" });

        expect(sessaoModel.update.mock.calls[0][1].where.id[Op.ne]).toBe("atual");
    });

    it("pelo refresh token de uma linha com família, poupa a família inteira", async () => {
        sessaoModel.findOne.mockResolvedValue(linha({ id: "atual", familiaId: "f9" }));

        await SessaoService.revogarTodosExceto("u1", { tokenAtual: "meu-refresh" });

        expect(sessaoModel.update.mock.calls[0][1].where[Op.or][0]).toEqual({ familiaId: { [Op.ne]: "f9" } });
    });
});

describe("revogar (logout)", () => {
    it("sem token nem família, não faz nada", async () => {
        await SessaoService.revogar(undefined);

        expect(sessaoModel.update).not.toHaveBeenCalled();
        expect(sessaoModel.findOne).not.toHaveBeenCalled();
    });

    it("pelo refresh token, encerra o login inteiro", async () => {
        sessaoModel.findOne.mockResolvedValue(linha());

        await SessaoService.revogar("meu-refresh");

        expect(sessaoModel.update.mock.calls[0][1].where).toEqual({ familiaId: "f1", usuarioId: "u1", revogadaEm: null });
    });

    it("só pelo access token (sem o refresh no corpo), encerra o login da família dele", async () => {
        await SessaoService.revogar(undefined, { usuarioId: "u1", familiaId: "f1" });

        expect(sessaoModel.update.mock.calls[0][1].where).toEqual({ familiaId: "f1", usuarioId: "u1", revogadaEm: null });
    });

    it("linha antiga (sem família): revoga a própria linha", async () => {
        const registro = linha({ familiaId: null });
        sessaoModel.findOne.mockResolvedValue(registro);

        await SessaoService.revogar("meu-refresh");

        expect(registro.update).toHaveBeenCalledWith({ revogadaEm: expect.any(Date) });
    });
});

describe("familiaViva", () => {
    it("pergunta só pela família, da própria conta, ativa e dentro do prazo", async () => {
        sessaoModel.findOne.mockResolvedValue({ id: "x" });

        expect(await SessaoService.familiaViva("u1", "f1")).toBe(true);

        const { where } = sessaoModel.findOne.mock.calls[0][0];
        expect(where).toMatchObject({ familiaId: "f1", usuarioId: "u1", revogadaEm: null });
        expect(where.expiraEm[Op.gt]).toBeInstanceOf(Date);
    });

    it("encerrada ou vencida: falso", async () => {
        sessaoModel.findOne.mockResolvedValue(null);

        expect(await SessaoService.familiaViva("u1", "f1")).toBe(false);
    });
});

describe("limpeza das sessões antigas", () => {
    it("apaga as vencidas há mais de 1 dia e as revogadas há mais de 7", async () => {
        const agora = new Date("2026-11-10T00:00:00Z").getTime();
        sessaoModel.destroy.mockResolvedValue(42);

        const apagadas = await SessaoService.limparAntigas({ agora });

        expect(apagadas).toBe(42);
        const [vencidas, revogadas] = sessaoModel.destroy.mock.calls[0][0].where[Op.or];
        expect(vencidas.expiraEm[Op.lt]).toEqual(new Date("2026-11-09T00:00:00Z"));
        expect(revogadas.revogadaEm[Op.lt]).toEqual(new Date("2026-11-03T00:00:00Z"));
    });

    it("nunca apaga uma sessão ativa recente: os dois critérios exigem vencimento ou revogação antigos", async () => {
        sessaoModel.destroy.mockResolvedValue(0);

        await SessaoService.limparAntigas();

        const criterios = sessaoModel.destroy.mock.calls[0][0].where[Op.or];
        expect(criterios).toHaveLength(2);
        for (const criterio of criterios) {
            expect(Object.keys(criterio)).toHaveLength(1);
            expect(["expiraEm", "revogadaEm"]).toContain(Object.keys(criterio)[0]);
        }
    });
});
