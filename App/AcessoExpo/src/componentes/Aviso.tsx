import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { cores } from '../tema';
import { Icone } from './Icone';

type Tipo = 'erro' | 'sucesso' | 'aviso' | 'info';

const visual = {
  erro: { fundo: cores.containerErro, texto: cores.sobreContainerErro, sf: 'exclamationmark.circle.fill', md: 'error', prefixo: 'Erro' },
  sucesso: { fundo: cores.containerSucesso, texto: cores.sucesso, sf: 'checkmark.circle.fill', md: 'check_circle', prefixo: 'Pronto' },
  aviso: { fundo: cores.containerAviso, texto: cores.sobreContainerAviso, sf: 'exclamationmark.triangle.fill', md: 'warning', prefixo: 'Atenção' },
  info: { fundo: cores.containerPrimaria, texto: cores.sobreContainerPrimaria, sf: 'info.circle.fill', md: 'info', prefixo: 'Informação' },
} as const;

/**
 * Faixa de mensagem com ícone + texto (não só cor). Quando a mensagem aparece ou muda, o VoiceOver
 * a lê sozinho (o iOS não tem "live region" como o Android; o anúncio faz esse papel).
 */
export function Aviso({ tipo, mensagem, anunciar = true }: { tipo: Tipo; mensagem: string | null | undefined; anunciar?: boolean }) {
  const estilo = visual[tipo];
  useEffect(() => {
    if (mensagem && anunciar) {
      AccessibilityInfo.announceForAccessibility(`${estilo.prefixo}: ${mensagem}`);
    }
  }, [mensagem, anunciar, estilo.prefixo]);

  if (!mensagem) {
    return null;
  }
  return (
    <View
      style={[estilos.caixa, { backgroundColor: estilo.fundo }]}
      accessible
      accessibilityRole={tipo === 'erro' ? 'alert' : 'text'}
      accessibilityLabel={`${estilo.prefixo}: ${mensagem}`}
      accessibilityLiveRegion="polite"
    >
      <Icone sf={estilo.sf} md={estilo.md} cor={estilo.texto} />
      <Text style={[estilos.texto, { color: estilo.texto }]}>{mensagem}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, alignItems: 'flex-start' },
  texto: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '500' },
});
