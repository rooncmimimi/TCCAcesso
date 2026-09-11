import { ouvirToqueEmNotificacaoPush } from "../notificacoes";
import type { DadosPush } from "../notificacoes";
import { navigationRef } from "./RootNavigator";

/**
 * Liga o TOQUE num push nativo (Fase R5) à navegação. Usa `navigationRef`
 * porque isso acontece fora de qualquer componente React (um callback do
 * SO) — é o cenário exato para o qual o React Navigation recomenda o ref.
 *
 * Mapeamento `entidadeTipo → tela` idêntico ao de
 * `NotificationsScreen.navegarSePossivel` (duplicado de propósito: dois
 * pontos de entrada para a mesma intenção, e o do push tem um fallback
 * próprio — abrir a lista de notificações — que a lista em si não precisa).
 *
 * Limitação conhecida: cobre toque com o app aberto ou em segundo plano.
 * Toque que ACORDA o app do zero (processo morto) abriria o app na tela
 * inicial, não direto no conteúdo — `getLastNotificationResponseAsync` /
 * `useLastNotificationResponse` resolveriam isso numa evolução futura.
 *
 * Chamada uma vez no boot (`App.tsx`); devolve a função de cancelamento.
 */
export function ligarNavegacaoPorToqueEmPush(): () => void {
  return ouvirToqueEmNotificacaoPush(({ entidadeTipo, entidadeId }: DadosPush) => {
    if (!navigationRef.isReady()) return;

    if (entidadeTipo === "usuario" && entidadeId) {
      navigationRef.navigate("App", { screen: "PublicProfile", params: { usuarioId: entidadeId } });
    } else if (entidadeTipo === "postagem" && entidadeId) {
      navigationRef.navigate("App", { screen: "PostagemDetail", params: { postagemId: entidadeId } });
    } else if (entidadeTipo === "vaga" && entidadeId) {
      navigationRef.navigate("App", { screen: "VagaDetail", params: { vagaId: entidadeId } });
    } else {
      // Sem tela direta (conversa, comentário, denúncia, empresa...) — leva à lista de notificações.
      navigationRef.navigate("App", { screen: "Tabs", params: { screen: "Notifications" } });
    }
  });
}
