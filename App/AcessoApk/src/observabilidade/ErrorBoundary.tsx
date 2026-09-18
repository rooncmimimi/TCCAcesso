import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { anunciarParaLeitorDeTela } from "../acessibilidade/anunciar";
import { capturarErro } from "./sentry";

interface ErrorBoundaryState {
  temErro: boolean;
}

/**
 * Rede de segurança para erros de renderização: sem ela, um erro não tratado em qualquer tela
 * derrubaria o app inteiro sem registro. Mostra uma tela com a opção de tentar de novo e envia o
 * erro ao Sentry.
 *
 * Fica fora de todos os providers em `App.tsx` para continuar funcionando quando o erro vem de um
 * deles. Pelo mesmo motivo não usa `useTema()` nem componentes de `components/ui`, e as cores são
 * fixas.
 *
 * É um componente de classe porque o React só oferece error boundary por `componentDidCatch` e
 * `getDerivedStateFromError`, sem equivalente em hook.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { temErro: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { temErro: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    capturarErro(erro, { componentStack: info.componentStack ?? undefined });

    // `componentDidCatch` só roda quando um filho lança, então o anúncio acontece uma vez por erro.
    // Usa `anunciarParaLeitorDeTela` porque a tela inteira é trocada e não há um nó estável para
    // `accessibilityLiveRegion`. A mensagem evita termos técnicos: quem ouve é quem usa o app.
    anunciarParaLeitorDeTela("Ocorreu um erro inesperado. Você pode tentar novamente.");
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

// Cores fixas, e não `tema.colors`, porque o erro pode ter vindo do próprio `TemaProvider`.
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
