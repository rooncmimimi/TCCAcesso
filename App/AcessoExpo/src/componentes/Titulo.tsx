import { Text, type TextStyle } from 'react-native';

import { texto } from '../tema';

/** Título de tela ou de seção, marcado como cabeçalho: o rotor do VoiceOver navega por eles. */
export function Titulo({ children, nivel = 1, estilo }: { children: string; nivel?: 1 | 2; estilo?: TextStyle }) {
  return (
    <Text accessibilityRole="header" style={[nivel === 1 ? texto.titulo : texto.subtitulo, estilo]}>
      {children}
    </Text>
  );
}
