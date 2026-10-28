import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { cores, espacos } from '../tema';

interface PropsTela {
  children: ReactNode;
  /** Puxar para atualizar (sempre com um botão "Atualizar" equivalente na tela: gesto nunca é o único caminho). */
  aoAtualizar?: () => void;
  atualizando?: boolean;
}

/**
 * Tela com rolagem: com o "Texto Maior" no máximo, nada fica cortado. No iPhone o conteúdo
 * desvia sozinho do cabeçalho, da barra de abas e do teclado.
 */
export function Tela({ children, aoAtualizar, atualizando = false }: PropsTela) {
  return (
    <ScrollView
      style={estilos.tela}
      contentContainerStyle={estilos.conteudo}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={
        aoAtualizar ? (
          <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor={cores.primaria} />
        ) : undefined
      }
    >
      <View style={estilos.coluna}>{children}</View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espacos.medio, paddingBottom: espacos.grande * 2 },
  // Em iPad e na web, a coluna não estica demais (linhas longas cansam a leitura).
  coluna: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: espacos.medio },
});
