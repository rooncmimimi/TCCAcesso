import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `NotificacaoPushService` sem banco, Storage ou API de push reais: `TokenPush` (Sequelize), o SDK da
 * Expo e a configuração de ambiente são mockados. Os testes garantem que o UPSERT por token troca a
 * conta sem duplicar, que o envio nunca lança e que tokens mortos (`DeviceNotRegistered`) são
 * apagados.
 */

const mocks = vi.hoisted(() => ({
    isExpoPushToken: vi.fn(),
    chunkPushNotifications: vi.fn(),
    sendPushNotificationsAsync: vi.fn()
}));

vi.mock("expo-server-sdk", () => ({
    Expo: class {
        chunkPushNotifications = mocks.chunkPushNotifications;
        sendPushNotificationsAsync = mocks.sendPushNotificationsAsync;
        static isExpoPushToken = mocks.isExpoPushToken;
    }
}));

vi.mock("../config/env.js", () => ({ default: { expoPush: { accessToken: null } } }));

vi.mock("../models/index.js", () => ({
    TokenPush: { findOrCreate: vi.fn(), destroy: vi.fn(), findAll: vi.fn() }
}));

const { TokenPush } = await import("../models/index.js");
const { default: NotificacaoPushService } = await import("./NotificacaoPushService.js");

const TOKEN = "ExponentPushToken[abc123]";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.isExpoPushToken.mockImplementation((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
    mocks.chunkPushNotifications.mockImplementation((msgs) => [msgs]);
    mocks.sendPushNotificationsAsync.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("NotificacaoPushService.registrar", () => {
    it("recusa um token que não é um Expo push token", async () => {
        await expect(NotificacaoPushService.registrar("u1", "token-qualquer", "android")).rejects.toThrow("Token de push inválido.");
        expect(TokenPush.findOrCreate).not.toHaveBeenCalled();
    });

    it("token novo: cria o registro", async () => {
        TokenPush.findOrCreate.mockResolvedValue([{ usuarioId: "u1", plataforma: "android", update: vi.fn() }, true]);

        const resultado = await NotificacaoPushService.registrar("u1", TOKEN, "android");

        expect(TokenPush.findOrCreate).toHaveBeenCalledWith({
            where: { token: TOKEN },
            defaults: { usuarioId: "u1", token: TOKEN, plataforma: "android" }
        });
        expect(resultado).toEqual({ registrado: true });
    });

    it("token já existente de OUTRA conta: reaponta usuarioId/plataforma (não duplica)", async () => {
        const update = vi.fn();
        TokenPush.findOrCreate.mockResolvedValue([{ usuarioId: "u1", plataforma: "ios", update }, false]);

        await NotificacaoPushService.registrar("u2", TOKEN, "android");

        expect(update).toHaveBeenCalledWith({ usuarioId: "u2", plataforma: "android" });
    });

    it("token já existente da MESMA conta e plataforma: não faz update à toa", async () => {
        const update = vi.fn();
        TokenPush.findOrCreate.mockResolvedValue([{ usuarioId: "u1", plataforma: "android", update }, false]);

        await NotificacaoPushService.registrar("u1", TOKEN, "android");

        expect(update).not.toHaveBeenCalled();
    });
});

describe("NotificacaoPushService.remover", () => {
    it("apaga o token e é idempotente (não erra se não existir)", async () => {
        TokenPush.destroy.mockResolvedValue(0);

        const resultado = await NotificacaoPushService.remover(TOKEN);

        expect(TokenPush.destroy).toHaveBeenCalledWith({ where: { token: TOKEN } });
        expect(resultado).toEqual({ removido: true });
    });
});

describe("NotificacaoPushService.enviarParaUsuario", () => {
    it("usuário sem nenhum token: não tenta enviar nada", async () => {
        TokenPush.findAll.mockResolvedValue([]);

        await NotificacaoPushService.enviarParaUsuario("u1", { titulo: "Oi", corpo: "Tudo bem?" });

        expect(mocks.sendPushNotificationsAsync).not.toHaveBeenCalled();
    });

    it("monta uma mensagem por token e envia em lotes", async () => {
        TokenPush.findAll.mockResolvedValue([
            { token: TOKEN, plataforma: "android" },
            { token: "ExponentPushToken[def456]", plataforma: "ios" }
        ]);

        await NotificacaoPushService.enviarParaUsuario("u1", {
            titulo: "Nova mensagem",
            corpo: "Ana te enviou uma mensagem",
            dados: { entidadeTipo: "conversa", entidadeId: "c1" }
        });

        expect(mocks.sendPushNotificationsAsync).toHaveBeenCalledTimes(1);
        const enviadas = mocks.sendPushNotificationsAsync.mock.calls[0][0];
        expect(enviadas).toHaveLength(2);
        expect(enviadas[0]).toMatchObject({ to: TOKEN, title: "Nova mensagem", body: "Ana te enviou uma mensagem", data: { entidadeTipo: "conversa", entidadeId: "c1" } });
    });

    it("token reportado como DeviceNotRegistered é apagado", async () => {
        TokenPush.findAll.mockResolvedValue([
            { token: TOKEN, plataforma: "android" },
            { token: "ExponentPushToken[morto]", plataforma: "android" }
        ]);
        mocks.sendPushNotificationsAsync.mockResolvedValue([
            { status: "ok" },
            { status: "error", details: { error: "DeviceNotRegistered" } }
        ]);

        await NotificacaoPushService.enviarParaUsuario("u1", { titulo: "Oi", corpo: "" });

        expect(TokenPush.destroy).toHaveBeenCalledWith({ where: { token: ["ExponentPushToken[morto]"] } });
    });

    it("erro no envio nunca vaza (fire-and-forget)", async () => {
        TokenPush.findAll.mockResolvedValue([{ token: TOKEN, plataforma: "android" }]);
        mocks.sendPushNotificationsAsync.mockRejectedValue(new Error("Expo fora do ar"));

        await expect(NotificacaoPushService.enviarParaUsuario("u1", { titulo: "Oi", corpo: "" })).resolves.toBeUndefined();
        expect(TokenPush.destroy).not.toHaveBeenCalled();
    });
});
