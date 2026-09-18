import { Text, View } from "react-native";

import { useAutenticacao } from "../autenticacao";
import { Botao, Cartao, ContainerTela } from "../components/ui";
import { useTema } from "../tema";

/**
 * Tela para conta de administrador, que entra normalmente no backend, mas não tem área no app. Em
 * vez de deixar a conta num app sem nada para mostrar, a tela explica o motivo e oferece a saída.
 */
export function ContaNaoSuportadaScreen() {
  const { tema } = useTema();
  const { sair } = useAutenticacao();

  return (
    <ContainerTela>
      <View style={{ flex: 1, justifyContent: "center", gap: tema.spacing.lg }}>
        <Cartao elevacao="md" style={{ gap: tema.spacing.sm }}>
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>
            Este app não é para contas administrativas
          </Text>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
            O aplicativo ACESSO é para candidatos e empresas. Para administrar a plataforma, acesse pelo site do
            ACESSO em um computador.
          </Text>
        </Cartao>
        <Botao variant="secondary" onPress={() => void sair()}>
          Sair
        </Botao>
      </View>
    </ContainerTela>
  );
}
