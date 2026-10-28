import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { cores } from '../tema';

interface PropsIcone {
  /** SF Symbol (iPhone). */
  sf: SFSymbol;
  /** Símbolo do Material, usado fora do iPhone (navegador, ao conferir as telas). */
  md: AndroidSymbol;
  tamanho?: number;
  cor?: ColorValue;
}

/**
 * Ícone sempre decorativo: fica fora do VoiceOver, porque o texto ao lado já diz o que é.
 * Nunca use um ícone sozinho como única informação.
 */
export function Icone({ sf, md, tamanho = 22, cor = cores.texto }: PropsIcone) {
  return (
    <SymbolView
      name={{ ios: sf, android: md, web: md }}
      size={tamanho}
      tintColor={cor}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    />
  );
}
