import { ouvirToqueEmNotificacaoPush } from "../notificacoes";
import type { DadosPush } from "../notificacoes";
import { refNavegacao } from "./RaizNavigator";

/**
 * Liga o toque num push nativo à navegação. Usa `refNavegacao` porque o toque chega por um callback
 * do sistema, fora dos componentes.
 *
 * O mapeamento `entidadeTipo` → tela segue o de `NotificacoesScreen.navegarSePossivel`; os tipos
 * sem tela própria abrem a lista de notificações.
 *
 * Cobre o toque com o app aberto ou em segundo plano. Se o toque abrir o app do zero, ele começa na
 * tela inicial; `getLastNotificationResponseAsync` resolveria esse caso.
 *
 * Chamada uma vez em `App.tsx`; devolve a função de cancelamento.
 */
export function ligarNavegacaoPorToqueEmPush(): () => void {
  return ouvirToqueEmNotificacaoPush(({ entidadeTipo, entidadeId }: DadosPush) => {
    if (!refNavegacao.isReady()) return;

    if (entidadeTipo === "usuario" && entidadeId) {
      refNavegacao.navigate("App", { screen: "PublicProfile", params: { usuarioId: entidadeId } });
    } else if (entidadeTipo === "postagem" && entidadeId) {
      refNavegacao.navigate("App", { screen: "PostagemDetail", params: { postagemId: entidadeId } });
    } else if (entidadeTipo === "vaga" && entidadeId) {
      refNavegacao.navigate("App", { screen: "VagaDetail", params: { vagaId: entidadeId } });
    } else {
      // Sem tela direta (conversa, comentário, denúncia, empresa...): leva à lista de notificações.
      refNavegacao.navigate("App", { screen: "Tabs", params: { screen: "Notifications" } });
    }
  });
}
