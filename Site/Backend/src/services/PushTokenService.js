import { Expo } from "expo-server-sdk";

import env from "../config/env.js";
import { PushToken } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

/**
 * Notificações push nativas (Fase R5) — usa o serviço de push da Expo
 * (expo.dev), que faz de proxy para FCM (Android) e APNs (iOS). O app só
 * precisa registrar o Expo push token do dispositivo; as credenciais reais
 * de FCM/APNs ficam no EAS, nunca aqui.
 *
 * Princípio herdado de `NotificacaoService`: falha de push NUNCA derruba a
 * ação principal. `enviarParaUsuario` engole qualquer erro e só loga.
 */
const expo = new Expo(env.expoPush.accessToken ? { accessToken: env.expoPush.accessToken } : {});

class PushTokenService {
    /**
     * Registra (ou reaponta) um token. UPSERT por `token`: o token pertence
     * ao DISPOSITIVO — se a conta A sai e a B entra no mesmo aparelho, o
     * mesmo token passa a ser da B, sem duplicar linha.
     */
    async registrar(usuarioId, token, plataforma) {
        if (!Expo.isExpoPushToken(token)) {
            throw ApiError.badRequest("Token de push inválido.");
        }

        const [registro, criado] = await PushToken.findOrCreate({
            where: { token },
            defaults: { usuarioId, token, plataforma }
        });

        if (
            !criado &&
            (String(registro.usuarioId) !== String(usuarioId) || registro.plataforma !== plataforma)
        ) {
            await registro.update({ usuarioId, plataforma });
        }

        return { registrado: true };
    }

    /**
     * Remove um token — chamado no logout do app. Idempotente: remover um
     * token que não existe (ou já foi removido) não é erro.
     */
    async remover(token) {
        await PushToken.destroy({ where: { token } });
        return { removido: true };
    }

    /**
     * Envia um push para TODOS os dispositivos de um usuário. Fire-and-forget
     * — nunca lança, nunca deve ser esperado por quem chama (`NotificacaoService`).
     * Tokens que a Expo reporta como `DeviceNotRegistered` são apagados na hora.
     */
    async enviarParaUsuario(usuarioId, { titulo, corpo, dados = {} }) {
        try {
            const registros = await PushToken.findAll({ where: { usuarioId } });
            if (registros.length === 0) {
                return;
            }

            const mensagens = registros
                .filter((registro) => Expo.isExpoPushToken(registro.token))
                .map((registro) => ({
                    to: registro.token,
                    sound: "default",
                    title: titulo,
                    body: corpo || "",
                    data: dados
                }));

            if (mensagens.length === 0) {
                return;
            }

            const tokensMortos = [];

            for (const chunk of expo.chunkPushNotifications(mensagens)) {
                try {
                    const tickets = await expo.sendPushNotificationsAsync(chunk);
                    tickets.forEach((ticket, indice) => {
                        if (
                            ticket.status === "error" &&
                            ticket.details &&
                            ticket.details.error === "DeviceNotRegistered"
                        ) {
                            tokensMortos.push(chunk[indice].to);
                        }
                    });
                } catch (erro) {
                    console.error("Falha ao enviar lote de push:", erro.message);
                }
            }

            if (tokensMortos.length > 0) {
                await PushToken.destroy({ where: { token: tokensMortos } });
            }
        } catch (erro) {
            console.error("Falha ao enviar push:", erro.message);
        }
    }
}

export default new PushTokenService();
