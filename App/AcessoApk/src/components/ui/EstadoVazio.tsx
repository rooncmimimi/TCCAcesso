import { Text } from "react-native";

import { useTema } from "../../tema";
import { Botao } from "./Botao";
import { Cartao } from "./Cartao";

type EstadoVazioProps = {
  /** Algumas telas (`ListaSeguidoresScreen`, `UsuariosBloqueadosScreen`) usam só uma
   * frase, sem título: omitir esta prop reproduz esse caso mais simples. */
  titulo?: string;
  descricao: string;
  acao?: { rotulo: string; onPress: () => void };
};

/**
 * Estado vazio de listas ("nenhum item encontrado"). Não inclui `ContainerTela`, porque fica dentro
 * de uma lista (`ListEmptyComponent`) ou do scroll da tela. Nas seções do perfil
 * (`screens/meuPerfil/`), a lista vazia continua como texto simples: o cabeçalho da seção já dá o
 * contexto, e um card seria peso visual à toa.
 */
export function EstadoVazio({ titulo, descricao, acao }: EstadoVazioProps) {
  const { tema } = useTema();

  return (
    <Cartao elevacao="md" style={{ gap: tema.spacing.xs }}>
      {titulo ? (
        <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>{titulo}</Text>
      ) : null}
      <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{descricao}</Text>
      {acao ? (
        <Botao variant="outline" size="small" onPress={acao.onPress}>
          {acao.rotulo}
        </Botao>
      ) : null}
    </Cartao>
  );
}
