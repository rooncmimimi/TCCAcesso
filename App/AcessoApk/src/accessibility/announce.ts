import { AccessibilityInfo } from "react-native";

/**
 * Faz o leitor de tela ativo (TalkBack, o mais comum no Android) anunciar
 * uma mensagem sem mover o foco — a API real do React Native para isto
 * (`AccessibilityInfo.announceForAccessibility`), não uma reimplementação.
 *
 * É a peça de infraestrutura que o item 26 da Fase 5 pede ("Salvar
 * configuração → foco/anúncio apropriado"), pronta para as próximas fases
 * chamarem quando uma ação real de salvar existir (a tela de Configurações
 * ainda é um placeholder — ver Fase 4/5). Nenhuma tela chama isto ainda.
 *
 * Não use isto para textos que já têm `accessibilityLiveRegion` (ex.: o
 * erro de formulário do `Input`) — anunciaria a mesma coisa duas vezes.
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}
