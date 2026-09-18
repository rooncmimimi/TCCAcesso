import { AccessibilityInfo } from "react-native";

/**
 * Faz o leitor de tela anunciar uma mensagem sem mover o foco. Usado para confirmar ações que não
 * mudam de tela, como enviar uma denúncia ou remover uma publicação.
 *
 * Não use em textos que já têm `accessibilityLiveRegion` (como o erro do `CampoTexto`), senão a
 * mensagem é lida duas vezes.
 */
export function anunciarParaLeitorDeTela(mensagem: string): void {
  AccessibilityInfo.announceForAccessibility(mensagem);
}
