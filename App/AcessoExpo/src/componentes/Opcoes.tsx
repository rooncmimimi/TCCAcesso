import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '../tema';

interface PropsOpcoes<T extends string> {
  rotulo: string;
  opcoes: readonly { valor: T | null; texto: string }[];
  valor: T | null;
  aoMudar: (valor: T | null) => void;
}

/** Grupo de escolha única (filtros). O VoiceOver diz "selecionado" e a posição ("2 de 4"). */
export function Opcoes<T extends string>({ rotulo, opcoes, valor, aoMudar }: PropsOpcoes<T>) {
  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo} accessibilityRole="header">
        {rotulo}
      </Text>
      <View style={estilos.linha} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
        {opcoes.map((opcao) => {
          const marcada = opcao.valor === valor;
          return (
            <Pressable
              key={opcao.texto}
              onPress={() => aoMudar(opcao.valor)}
              accessibilityRole="radio"
              accessibilityState={{ checked: marcada }}
              accessibilityLabel={opcao.texto}
              style={[estilos.opcao, marcada && estilos.marcada]}
            >
              <Text style={[estilos.texto, marcada && estilos.textoMarcado]}>
                {marcada ? '✓ ' : ''}
                {opcao.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 8 },
  rotulo: { fontSize: 15, fontWeight: '600', color: cores.texto },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcao: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: cores.contorno,
    backgroundColor: cores.superficie,
    justifyContent: 'center',
  },
  marcada: { backgroundColor: cores.containerPrimaria, borderColor: cores.primaria },
  texto: { fontSize: 16, color: cores.texto },
  textoMarcado: { color: cores.sobreContainerPrimaria, fontWeight: '700' },
});
