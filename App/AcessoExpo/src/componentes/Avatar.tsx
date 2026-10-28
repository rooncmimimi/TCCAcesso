import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { resolverUrl } from '../servicos/config';
import { cores } from '../tema';
import { iniciais } from '../utilitarios/rotulos';

/** Foto ou iniciais. Decorativo: o nome da pessoa sempre aparece escrito ao lado. */
export function Avatar({ nome, url, tamanho = 44 }: { nome: string | null; url: string | null; tamanho?: number }) {
  const endereco = resolverUrl(url);
  const forma = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  return (
    <View
      style={[estilos.base, forma]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      {endereco ? (
        <Image source={{ uri: endereco }} style={forma} contentFit="cover" accessible={false} />
      ) : (
        <Text style={[estilos.iniciais, { fontSize: tamanho * 0.38 }]} allowFontScaling={false}>
          {iniciais(nome)}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { backgroundColor: cores.containerPrimaria, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iniciais: { color: cores.sobreContainerPrimaria, fontWeight: '700' },
});
