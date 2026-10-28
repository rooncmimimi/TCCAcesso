import { ActivityIndicator, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { ALVO_TOQUE, cores } from '../tema';

type Variante = 'primario' | 'secundario' | 'texto' | 'perigo';

interface PropsBotao {
  titulo: string;
  onPress: (evento: GestureResponderEvent) => void;
  variante?: Variante;
  desativado?: boolean;
  /** Mostra o indicador e avisa o VoiceOver que está ocupado; o texto do botão continua o mesmo. */
  carregando?: boolean;
  /** Para quando o texto visível sozinho não basta (ex.: "Curtir" → "Curtir publicação de Ana"). */
  rotuloAcessivel?: string;
  dica?: string;
  icone?: React.ReactNode;
  selecionado?: boolean;
}

/** Botão com área de toque de no mínimo 48 pontos (acima dos 44 do iOS) e altura que cresce com o texto. */
export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  desativado = false,
  carregando = false,
  rotuloAcessivel,
  dica,
  icone,
  selecionado,
}: PropsBotao) {
  const inativo = desativado || carregando;
  const estilo = variantes[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? titulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: inativo, busy: carregando, selected: selecionado }}
      hitSlop={4}
      style={({ pressed }) => [estilos.base, estilo.caixa, pressed && estilos.pressionado, inativo && estilos.inativo]}
    >
      <View style={estilos.conteudo}>
        {carregando ? <ActivityIndicator color={estilo.texto.color} accessible={false} /> : icone}
        <Text style={[estilos.texto, estilo.texto]}>{titulo}</Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: Math.max(ALVO_TOQUE, 48),
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  texto: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  pressionado: { opacity: 0.75 },
  inativo: { opacity: 0.55 },
});

const variantes = {
  primario: StyleSheet.create({
    caixa: { backgroundColor: cores.primaria },
    texto: { color: cores.sobrePrimaria },
  }),
  secundario: StyleSheet.create({
    caixa: { backgroundColor: cores.superficie, borderWidth: 1.5, borderColor: cores.primaria },
    texto: { color: cores.primaria },
  }),
  texto: StyleSheet.create({
    caixa: { backgroundColor: 'transparent', paddingHorizontal: 8 },
    texto: { color: cores.primaria, textDecorationLine: 'underline' },
  }),
  perigo: StyleSheet.create({
    caixa: { backgroundColor: cores.superficie, borderWidth: 1.5, borderColor: cores.erro },
    texto: { color: cores.erro },
  }),
};
