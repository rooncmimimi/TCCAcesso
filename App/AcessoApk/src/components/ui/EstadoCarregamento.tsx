import { ActivityIndicator, View } from "react-native";

import { useTema } from "../../tema";
import { ContainerTela } from "./ContainerTela";

type EstadoCarregamentoProps = {
  /** Texto anunciado pelos leitores de tela, como o "Carregando sua sessão" da `SplashScreen`. */
  rotulo?: string;
};

/**
 * Carregamento de tela inteira, só na primeira carga, antes de existir conteúdo. Carregamentos
 * parciais (próxima página, comentários de uma publicação) usam um indicador menor dentro da
 * própria tela.
 */
export function EstadoCarregamento({ rotulo = "Carregando" }: EstadoCarregamentoProps) {
  const { tema } = useTema();

  return (
    <ContainerTela>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={tema.colors.primary.solid} size="large" accessibilityLabel={rotulo} />
      </View>
    </ContainerTela>
  );
}
