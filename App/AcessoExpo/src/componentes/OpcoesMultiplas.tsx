import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '../tema';

interface PropsMultiplas {
  rotulo: string;
  opcoes: readonly { valor: string; texto: string }[];
  marcadas: readonly string[];
  aoMudar: (marcadas: string[]) => void;
}

/** Grupo de escolha múltipla (caixas de marcação). O estado aparece escrito ("✓"), não só na cor. */
export function OpcoesMultiplas({ rotulo, opcoes, marcadas, aoMudar }: PropsMultiplas) {
  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo} accessibilityRole="header">
        {rotulo}
      </Text>
      <View style={estilos.coluna}>
        {opcoes.map((opcao) => {
          const marcada = marcadas.includes(opcao.valor);
          return (
            <Pressable
              key={opcao.valor}
              onPress={() => aoMudar(marcada ? marcadas.filter((valor) => valor !== opcao.valor) : [...marcadas, opcao.valor])}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcada }}
              accessibilityLabel={opcao.texto}
              style={[estilos.opcao, marcada && estilos.marcada]}
            >
              <Text style={[estilos.caixa, marcada && estilos.textoMarcado]}>{marcada ? '☑' : '☐'}</Text>
              <Text style={[estilos.texto, marcada && estilos.textoMarcado]}>{opcao.texto}</Text>
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
  coluna: { gap: 8 },
  opcao: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: cores.contorno,
    backgroundColor: cores.superficie,
  },
  marcada: { backgroundColor: cores.containerPrimaria, borderColor: cores.primaria },
  caixa: { fontSize: 22, color: cores.textoSecundario },
  texto: { flex: 1, fontSize: 16, color: cores.texto },
  textoMarcado: { color: cores.sobreContainerPrimaria, fontWeight: '700' },
});
