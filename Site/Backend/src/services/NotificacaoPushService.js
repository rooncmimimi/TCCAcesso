import { Expo } from "expo-server-sdk";

import env from "../config/env.js";
import { TokenPush } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";

/**
 * Notificações push nativas pelo serviço da Expo (expo.dev), que repassa para FCM (Android) e APNs
 * (iOS). O app só registra o Expo push token do aparelho; as credenciais reais de FCM e APNs ficam
 * no EAS, nunca aqui.
 *
 * Como no `NotificacaoService`, falha de push nunca derruba a ação principal: `enviarParaUsuario`
 * engole qualquer erro e só registra no log.
 */
const expo = new Expo(env.expoPush.accessToken ? { accessToken: env.expoPush.accessToken } : {});

class NotificacaoPushService {
    /**
     * Registra (ou reaponta) um token. UPSERT por `token`: o token pertence
     * ao dispositivo; se a conta A sai e a B entra no mesmo aparelho, o
     * mesmo token passa a ser da B, sem duplicar linha.
     */
    async registrar(usuarioId, token, plataforma) {
        if (!Expo.isExpoPushToken(token)) {
            throw ErroApi.requisicaoInvalida("Token de push inválido.");
        }

        const [registro, criado] = await TokenPush.findOrCreate({
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
     * Remove um token. Chamado no logout do app. Idempotente: remover um
     * token que não existe (ou já foi removido) não é erro.
     */
    async remover(token) {
        await TokenPush.destroy({ where: { token } });
        return { removido: true };
    }

    /**
     * Remove todos os tokens da conta. Acompanha a revogação das sessões na troca de senha: sem
     * isso, um aparelho que perdeu a sessão continuaria recebendo os pushes da conta, que é
     * justamente o que a troca de senha quer cortar. Cada aparelho registra o token de novo ao
     * entrar (`registrarDispositivoParaPush`, no app).
     */
    async removerTodosDoUsuario(usuarioId) {
        const removidos = await TokenPush.destroy({ where: { usuarioId } });
        return { removidos };
    }

    /**
     * Envia um push para todos os dispositivos de um usuário. Fire-and-forget:
     * nunca lança, nunca deve ser esperado por quem chama (`NotificacaoService`).
     * Tokens que a Expo reporta como `DeviceNotRegistered` são apagados na hora.
     */
    async enviarParaUsuario(usuarioId, { titulo, corpo, dados = {} }) {
        try {
            const registros = await TokenPush.findAll({ where: { usuarioId } });
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
                await TokenPush.destroy({ where: { token: tokensMortos } });
            }
        } catch (erro) {
            console.error("Falha ao enviar push:", erro.message);
        }
    }
}

export default new NotificacaoPushService();
