import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

import { NotificacaoService } from "./NotificacaoService";
import type { PlataformaPush } from "./types";
import { capturarErro } from "../observabilidade";

const CANAL_ANDROID = "default";

/** Alvo carregado no `data` de um push — montado pelo backend em `NotificacaoService.emitirNotificacaoCriada` (Fase R5). */
export interface DadosPush {
  notificacaoId?: string;
  entidadeTipo?: string | null;
  entidadeId?: string | null;
}

/**
 * Push nativo NÃO existe no Expo Go desde o SDK 53 — e mais: só `import`ar
 * `expo-notifications` dentro do Expo Go no Android já DERRUBA o app (o
 * módulo tem um efeito colateral no load que registra um listener nativo
 * que não existe lá, e ele lança em vez de só avisar).
 *
 * Por isso o módulo é carregado SOB DEMANDA (`require`), e só fora do Expo
 * Go. No Expo Go tudo aqui vira no-op silencioso — o que não muda nada na
 * prática, porque push nativo não funcionaria lá de qualquer forma. Em dev
 * build / build de produção o `require` carrega o módulo normalmente.
 */
const EXPO_GO = isRunningInExpoGo();

type ModuloNotifications = typeof import("expo-notifications");
let moduloCache: ModuloNotifications | null = null;

function obterNotifications(): ModuloNotifications | null {
  if (EXPO_GO) return null;
  if (!moduloCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga condicional de propósito (ver bloco acima).
    moduloCache = require("expo-notifications") as ModuloNotifications;
  }
  return moduloCache;
}

function plataformaAtual(): PlataformaPush | null {
  if (Platform.OS === "android") return "android";
  if (Platform.OS === "ios") return "ios";
  return null; // web/outros — push nativo não se aplica
}

/**
 * Chamado UMA vez no boot do app (`App.tsx`) — define como um push aparece
 * enquanto o app está aberto. Sem isto, o push chegado com o app em
 * primeiro plano seria engolido silenciosamente. No-op no Expo Go.
 */
export function configurarNotificacoesPush(): void {
  const Notifications = obterNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function garantirCanalAndroid(Notifications: ModuloNotifications): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: "Notificações do ACESSO",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Pede permissão (uma vez — não insiste se o usuário recusar), pega o Expo
 * push token e registra no backend. Chamado quando uma sessão fica ativa
 * (login / restauração ao abrir), a partir do `AuthProvider`.
 *
 * FAIL-SOFT em tudo: Expo Go, permissão negada, rodando em emulador, `eas
 * init` não feito (sem `projectId`), rede fora do ar — nada disso trava o
 * app. As notificações em tempo real (Socket.IO, com o app aberto)
 * continuam funcionando sem depender disto.
 */
export async function registrarDispositivoParaPush(): Promise<void> {
  const Notifications = obterNotifications();
  if (!Notifications) return;

  const plataforma = plataformaAtual();
  if (!plataforma) return;

  try {
    await garantirCanalAndroid(Notifications);

    const atual = await Notifications.getPermissionsAsync();
    let status = atual.status;
    if (status !== "granted" && atual.canAskAgain) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    // Sem argumento: `expo-notifications` resolve o `projectId` sozinho a
    // partir de `expoConfig.extra.eas.projectId` (preenchido por `eas
    // init`). Se não houver, lança — e o catch abaixo trata como fail-soft.
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await NotificacaoService.registrarPushToken(token, plataforma);
  } catch (erro) {
    capturarErro(erro, { contexto: "registrarDispositivoParaPush" });
  }
}

/**
 * Remove o token deste dispositivo no backend — chamado no logout, para
 * este aparelho parar de receber push da conta que saiu. Fail-soft (se o
 * token não puder ser recuperado, o backend acaba limpando sozinho quando
 * um envio bate em `DeviceNotRegistered`). No-op no Expo Go.
 */
export async function removerDispositivoDoPush(): Promise<void> {
  const Notifications = obterNotifications();
  if (!Notifications) return;

  if (!plataformaAtual()) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await NotificacaoService.removerPushToken(token);
  } catch (erro) {
    capturarErro(erro, { contexto: "removerDispositivoDoPush" });
  }
}

/**
 * Liga o toque num push à navegação para o conteúdo relacionado. Devolve a
 * função de cancelamento (`EventSubscription.remove`). No Expo Go devolve um
 * cancelamento vazio.
 */
export function ouvirToqueEmNotificacaoPush(aoTocar: (dados: DadosPush) => void): () => void {
  const Notifications = obterNotifications();
  if (!Notifications) return () => undefined;

  const inscricao = Notifications.addNotificationResponseReceivedListener((resposta) => {
    aoTocar((resposta.notification.request.content.data ?? {}) as DadosPush);
  });
  return () => inscricao.remove();
}
