import { Text, View } from "react-native";

import { useTema } from "../../tema";
import { Botao } from "./Botao";
import { Cartao } from "./Cartao";
import { ContainerTela } from "./ContainerTela";

type EstadoErroProps = {
  titulo: string;
  mensagem: string;
  onTentarNovamente: () => void;
  /**
   * Algumas telas (como `VagasScreen`) mantêm este card durante a nova tentativa, com o botão em
   * carregamento; outras (como `MeuPerfilScreen`) trocam para `EstadoCarregamento`. Sem esta prop,
   * vale o segundo caso.
   */
  tentandoNovamente?: boolean;
};

/**
 * Erro de tela inteira na primeira carga, quando a tela ainda não tem conteúdo. Erros de ações
 * secundárias (próxima página, salvar um campo) são tratados dentro da própria tela.
 */
export function EstadoErro({ titulo, mensagem, onTentarNovamente, tentandoNovamente = false }: EstadoErroProps) {
  const { tema } = useTema();

  return (
    <ContainerTela>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Cartao elevacao="md" style={{ gap: tema.spacing.sm }}>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[tema.typography.title, { color: tema.colors.textPrimary }]}
          >
            {titulo}
          </Text>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{mensagem}</Text>
          <Botao onPress={onTentarNovamente} carregando={tentandoNovamente} disabled={tentandoNovamente}>
            Tentar novamente
          </Botao>
        </Cartao>
      </View>
    </ContainerTela>
  );
}
