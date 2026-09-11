import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `PushTokenService` (Fase R5) — nenhum acesso a banco, Storage ou à API de
 * push reais: `PushToken` (Sequelize), o SDK da Expo e a config de ambiente
 * são todos mockados. O que importa aqui: o UPSERT por token reaponta a
 * conta sem duplicar, o envio nunca lança, e tokens mortos
 * (`DeviceNotRegistered`) são apagados.
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
    PushToken: { findOrCreate: vi.fn(), destroy: vi.fn(), findAll: vi.fn() }
}));

const { PushToken } = await import("../models/index.js");
const { default: PushTokenService } = await import("./PushTokenService.js");

const TOKEN = "ExponentPushToken[abc123]";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.isExpoPushToken.mockImplementation((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
    mocks.chunkPushNotifications.mockImplementation((msgs) => [msgs]);
    mocks.sendPushNotificationsAsync.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PushTokenService.registrar", () => {
    it("recusa um token que não é um Expo push token", async () => {
        await expect(PushTokenService.registrar("u1", "token-qualquer", "android")).rejects.toThrow("Token de push inválido.");
        expect(PushToken.findOrCreate).not.toHaveBeenCalled();
    });

    it("token novo: cria o registro", async () => {
        PushToken.findOrCreate.mockResolvedValue([{ usuarioId: "u1", plataforma: "android", update: vi.fn() }, true]);

        const resultado = await PushTokenService.registrar("u1", TOKEN, "android");

        expect(PushToken.findOrCreate).toHaveBeenCalledWith({
            where: { token: TOKEN },
            defaults: { usuarioId: "u1", token: TOKEN, plataforma: "android" }
        });
        expect(resultado).toEqual({ registrado: true });
    });

    it("token já existente de OUTRA conta: reaponta usuarioId/plataforma (não duplica)", async () => {
        const update = vi.fn();
        PushToken.findOrCreate.mockResolvedValue([{ usuarioId: "u1", plataforma: "ios", update }, false]);

        await PushTokenService.registrar("u2", TOKEN, "android");

        expect(update).toHaveBeenCalledWith({ usuarioId: "u2", plataforma: "android" });
    });

    it("token já existente da MESMA conta e plataforma: não faz update à toa", async () => {
        const update = vi.fn();
        PushToken.findOrCreate.mockResolvedValue([{ usuarioId: "u1", plataforma: "android", update }, false]);

        await PushTokenService.registrar("u1", TOKEN, "android");

        expect(update).not.toHaveBeenCalled();
    });
});

describe("PushTokenService.remover", () => {
    it("apaga o token e é idempotente (não erra se não existir)", async () => {
        PushToken.destroy.mockResolvedValue(0);

        const resultado = await PushTokenService.remover(TOKEN);

        expect(PushToken.destroy).toHaveBeenCalledWith({ where: { token: TOKEN } });
        expect(resultado).toEqual({ removido: true });
    });
});

describe("PushTokenService.enviarParaUsuario", () => {
    it("usuário sem nenhum token: não tenta enviar nada", async () => {
        PushToken.findAll.mockResolvedValue([]);

        await PushTokenService.enviarParaUsuario("u1", { titulo: "Oi", corpo: "Tudo bem?" });

        expect(mocks.sendPushNotificationsAsync).not.toHaveBeenCalled();
    });

    it("monta uma mensagem por token e envia em lotes", async () => {
        PushToken.findAll.mockResolvedValue([
            { token: TOKEN, plataforma: "android" },
            { token: "ExponentPushToken[def456]", plataforma: "ios" }
        ]);

        await PushTokenService.enviarParaUsuario("u1", {
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
        PushToken.findAll.mockResolvedValue([
            { token: TOKEN, plataforma: "android" },
            { token: "ExponentPushToken[morto]", plataforma: "android" }
        ]);
        mocks.sendPushNotificationsAsync.mockResolvedValue([
            { status: "ok" },
            { status: "error", details: { error: "DeviceNotRegistered" } }
        ]);

        await PushTokenService.enviarParaUsuario("u1", { titulo: "Oi", corpo: "" });

        expect(PushToken.destroy).toHaveBeenCalledWith({ where: { token: ["ExponentPushToken[morto]"] } });
    });

    it("erro no envio nunca vaza (fire-and-forget)", async () => {
        PushToken.findAll.mockResolvedValue([{ token: TOKEN, plataforma: "android" }]);
        mocks.sendPushNotificationsAsync.mockRejectedValue(new Error("Expo fora do ar"));

        await expect(PushTokenService.enviarParaUsuario("u1", { titulo: "Oi", corpo: "" })).resolves.toBeUndefined();
        expect(PushToken.destroy).not.toHaveBeenCalled();
    });
});
