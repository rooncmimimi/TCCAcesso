import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { announceForAccessibility } from "../accessibility/announce";
import { capturarErro } from "./sentry";

interface ErrorBoundaryState {
  temErro: boolean;
}

/**
 * Rede de segurança global (Fase 25) — sem isto, qualquer erro de
 * renderização não tratado em QUALQUER tela derrubava o app inteiro (tela
 * vermelha em desenvolvimento, tela em branco/crash em produção), sem
 * nenhum relato de onde/por quê. Fica no topo de `App.tsx`, FORA de todos
 * os outros provedores (`SafeAreaProvider`/`AccessibilityProvider`/
 * `ThemeProvider`/...) de propósito: precisa continuar funcionando mesmo
 * se o erro acontecer DENTRO de um desses provedores.
 *
 * Por isso é a ÚNICA tela do app que NUNCA usa `useTheme()`/`ScreenContainer`/
 * qualquer componente de `components/ui` — todos dependem de contexto que
 * pode ser exatamente o que quebrou. Cores e espaçamento são fixos aqui, de
 * propósito, não um oversight.
 *
 * Componente de CLASSE, não função — é a única forma que o React oferece
 * hoje para um "error boundary" (`componentDidCatch`/
 * `getDerivedStateFromError` não têm equivalente em hook), exceção
 * deliberada ao resto do app (só componentes de função).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { temErro: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { temErro: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    capturarErro(erro, { componentStack: info.componentStack ?? undefined });

    // `componentDidCatch` só é chamado quando um filho de fato lança (nunca
    // de novo só por causa de um re-render da própria tela de erro) — por
    // isso o anúncio acontece exatamente uma vez por erro capturado, nunca
    // em loop. Mesmo padrão de "um mecanismo por evento" do
    // `LoginScreen.tsx` (`announceForAccessibility` para uma troca de tela
    // inteira, já que o Card antigo desmonta e um novo monta — não há um nó
    // estável para um `accessibilityLiveRegion`). Mensagem sem termos
    // técnicos/stack trace de propósito: quem ouve isso é a pessoa usando o
    // app, não um desenvolvedor.
    announceForAccessibility("Ocorreu um erro inesperado. Você pode tentar novamente.");
  }

  reiniciar = (): void => {
    this.setState({ temErro: false });
  };

  render() {
    if (!this.state.temErro) {
      return this.props.children;
    }

    return (
      <View style={estilos.container}>
        <Text accessibilityRole="header" style={estilos.titulo}>
          Algo deu errado
        </Text>
        <Text style={estilos.corpo}>
          O ACESSO encontrou um problema inesperado. Você pode tentar novamente — se persistir, feche e abra o
          aplicativo de novo.
        </Text>
        <Pressable
          onPress={this.reiniciar}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
          style={estilos.botao}
        >
          <Text style={estilos.textoBotao}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }
}

// Cores fixas (não `theme.colors.*`) — ver comentário acima: este
// componente precisa funcionar mesmo se o `ThemeProvider` for a origem do
// erro. Paleta neutra simples, legível em qualquer aparelho.
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
    gap: 16,
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1F29",
    textAlign: "center",
  },
  corpo: {
    fontSize: 15,
    color: "#4B5566",
    textAlign: "center",
    lineHeight: 22,
  },
  botao: {
    minHeight: 48,
    minWidth: 200,
    borderRadius: 8,
    backgroundColor: "#1E6F5C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
