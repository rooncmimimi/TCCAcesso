import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { Ref } from 'react';

import type { TextInputInstance } from '../utilitarios/tipos';
import { ALVO_TOQUE, cores, texto } from '../tema';

interface PropsCampo extends Omit<TextInputProps, 'style' | 'accessibilityLabel'> {
  rotulo: string;
  erro?: string | null;
  /** Texto de ajuda sempre visível abaixo do campo (ex.: formato esperado). */
  ajuda?: string;
  ref?: Ref<TextInputInstance>;
}

/**
 * Campo com rótulo visível acima (não some ao digitar, como o placeholder) e erro escrito abaixo,
 * com ícone de texto "!" além da cor. O VoiceOver lê o rótulo, o erro e a ajuda junto com o campo.
 */
export function Campo({ rotulo, erro, ajuda, ref, ...props }: PropsCampo) {
  const descricao = [erro ? `Erro: ${erro}` : null, ajuda].filter(Boolean).join('. ');
  return (
    <View style={estilos.grupo}>
      <Text style={texto.rotulo} accessible={false} importantForAccessibility="no" aria-hidden>
        {rotulo}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={descricao ? `${rotulo}. ${descricao}` : rotulo}
        placeholderTextColor={cores.textoSecundario}
        style={[estilos.campo, props.multiline ? estilos.multilinha : null, erro ? estilos.campoComErro : null]}
        {...props}
      />
      {erro ? (
        <Text style={estilos.erro} accessible={false} importantForAccessibility="no" aria-hidden>
          ! {erro}
        </Text>
      ) : null}
      {ajuda ? (
        <Text style={texto.secundario} accessible={false} importantForAccessibility="no" aria-hidden>
          {ajuda}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 6 },
  campo: {
    minHeight: Math.max(ALVO_TOQUE, 48),
    borderWidth: 1.5,
    borderColor: cores.contorno,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
    color: cores.texto,
    backgroundColor: cores.superficie,
  },
  multilinha: { minHeight: 160, textAlignVertical: 'top' },
  campoComErro: { borderColor: cores.erro, borderWidth: 2 },
  erro: { fontSize: 15, color: cores.erro, fontWeight: '600' },
});
